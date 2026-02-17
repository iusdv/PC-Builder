using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PCPartPicker.Infrastructure.Identity;
using System.Text.Json;
using System.Text.Json.Serialization;
using MySqlConnector;
using PCPartPicker.Application.Interfaces;
using PCPartPicker.Application.Services;
using PCPartPicker.Api.Services;
using PCPartPicker.Infrastructure.Data;
using System.Text;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

LoadDotEnvFile(builder.Environment.ContentRootPath);
ConfigureRenderPortBinding(builder);

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var connectionString = ResolveConnectionString();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredLength = 8;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
var jwtIssuer = jwtSection["Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER");
var jwtAudience = jwtSection["Audience"] ?? Environment.GetEnvironmentVariable("JWT_AUDIENCE");

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("Missing JWT signing key. Set Jwt:Key in appsettings.json or JWT_KEY env var.");
}

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = !string.IsNullOrWhiteSpace(jwtIssuer),
            ValidIssuer = jwtIssuer,
            ValidateAudience = !string.IsNullOrWhiteSpace(jwtAudience),
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.RequireAssertion(_ => true);
            return;
        }

        policy.RequireAuthenticatedUser()
              .RequireClaim(ClaimTypes.Role, "admin");
    });
});

builder.Services.AddScoped<ICompatibilityService, CompatibilityService>();
builder.Services.AddScoped<IWattageEstimator, WattageEstimator>();
builder.Services.AddScoped<IBuildPartCompatibilityService, BuildPartCompatibilityService>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddScoped<RefreshTokenService>();

builder.Services.AddCors(options =>
{
    var allowedOrigins = ResolveAllowedCorsOrigins();

    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowCredentials()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();
app.UseForwardedHeaders();

if (ShouldApplyMigrationsOnStartup())
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();
app.UseDefaultFiles();
app.UseStaticFiles();

app.Run();

static string RequireEnv(string key)
{
    var value = Environment.GetEnvironmentVariable(key);
    if (value is null)
    {
        throw new InvalidOperationException(
            $"Missing required environment variable '{key}'. " +
            "Create a .env file in backend/PCPartPicker.Api or set the variable in your environment.");
    }

    return value;
}

static string ResolveConnectionString()
{
    var fullConnectionString = Environment.GetEnvironmentVariable("DATABASE_CONNECTION_STRING");
    if (!string.IsNullOrWhiteSpace(fullConnectionString))
    {
        return fullConnectionString;
    }

    return BuildConnectionStringFromDiscreteEnvVars();
}

static string BuildConnectionStringFromDiscreteEnvVars()
{
    var host = RequireEnv("DATABASE_HOST");
    var portRaw = RequireEnv("DATABASE_PORT");
    var database = RequireEnv("DATABASE_NAME");
    var username = RequireEnv("DATABASE_USER");
    var password = Environment.GetEnvironmentVariable("DATABASE_PASSWORD") ?? string.Empty;
    var sslMode = ParseSslMode(Environment.GetEnvironmentVariable("DATABASE_SSL_MODE"));

    if (!uint.TryParse(portRaw, out var port) || port == 0)
    {
        throw new InvalidOperationException("Invalid DATABASE_PORT. Expected a number like 3306.");
    }

    var csb = new MySqlConnectionStringBuilder
    {
        Server = host,
        Port = port,
        Database = database,
        UserID = username,
        Password = password,
        SslMode = sslMode,
    };

    return csb.ConnectionString;
}

static MySqlSslMode ParseSslMode(string? rawValue)
{
    if (string.IsNullOrWhiteSpace(rawValue))
    {
        return MySqlSslMode.None;
    }

    if (Enum.TryParse<MySqlSslMode>(rawValue, ignoreCase: true, out var parsed))
    {
        return parsed;
    }

    if (string.Equals(rawValue, "verify-ca", StringComparison.OrdinalIgnoreCase))
    {
        return MySqlSslMode.VerifyCA;
    }

    if (string.Equals(rawValue, "verify-full", StringComparison.OrdinalIgnoreCase))
    {
        return MySqlSslMode.VerifyFull;
    }

    throw new InvalidOperationException(
        "Invalid DATABASE_SSL_MODE. Use one of: None, Preferred, Required, VerifyCA, VerifyFull.");
}

static string[] ResolveAllowedCorsOrigins()
{
    var raw = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS");
    if (!string.IsNullOrWhiteSpace(raw))
    {
        var parsed = raw
            .Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (parsed.Length > 0)
        {
            return parsed;
        }
    }

    return ["http://localhost:5173", "http://localhost:3000"];
}

static void ConfigureRenderPortBinding(WebApplicationBuilder builder)
{
    var portRaw = Environment.GetEnvironmentVariable("PORT");
    if (!int.TryParse(portRaw, out var port) || port <= 0)
    {
        return;
    }

    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

static bool ShouldApplyMigrationsOnStartup()
{
    var raw = Environment.GetEnvironmentVariable("APPLY_DB_MIGRATIONS_ON_STARTUP");
    if (string.IsNullOrWhiteSpace(raw))
    {
        return true;
    }

    if (bool.TryParse(raw, out var parsed))
    {
        return parsed;
    }

    throw new InvalidOperationException(
        "Invalid APPLY_DB_MIGRATIONS_ON_STARTUP. Expected true or false.");
}

static void LoadDotEnvFile(string contentRootPath)
{
    var filePath = Path.Combine(contentRootPath, ".env");

    if (!File.Exists(filePath))
    {
        return;
    }

    foreach (var rawLine in File.ReadAllLines(filePath))
    {
        var line = rawLine.Trim();
        if (line.Length == 0 || line.StartsWith('#'))
        {
            continue;
        }

        var idx = line.IndexOf('=');
        if (idx <= 0)
        {
            continue;
        }

        var key = line[..idx].Trim();
        var value = line[(idx + 1)..].Trim();

        if (key.Length == 0)
        {
            continue;
        }

        if (value.Length >= 2 && ((value.StartsWith('"') && value.EndsWith('"')) || (value.StartsWith('\'') && value.EndsWith('\''))))
        {
            value = value[1..^1];
        }

        if (Environment.GetEnvironmentVariable(key) is null)
        {
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}
