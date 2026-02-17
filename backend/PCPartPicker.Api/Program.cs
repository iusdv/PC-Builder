using Microsoft.AspNetCore.Authentication.JwtBearer;
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

var host = RequireEnv("DATABASE_HOST");
var portRaw = RequireEnv("DATABASE_PORT");
var database = RequireEnv("DATABASE_NAME");
var username = RequireEnv("DATABASE_USER");
var password = Environment.GetEnvironmentVariable("DATABASE_PASSWORD") ?? string.Empty;

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
    SslMode = MySqlSslMode.None,
};

var connectionString = csb.ConnectionString;

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
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowCredentials()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

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
