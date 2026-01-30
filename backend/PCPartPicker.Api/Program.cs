using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using PCPartPicker.Application.Interfaces;
using PCPartPicker.Application.Services;
using PCPartPicker.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

LoadDotEnvFile(builder.Environment.ContentRootPath);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure MySQL with Pomelo
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

// Register application services
builder.Services.AddScoped<ICompatibilityService, CompatibilityService>();
builder.Services.AddScoped<IWattageEstimator, WattageEstimator>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Seed database on startup (optional)
// using (var scope = app.Services.CreateScope())
// {
//     var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    
//     // Ensure database is created and apply migrations
//     context.Database.Migrate();
    
//     // Seed sample data
//     DatabaseSeeder.SeedData(context);
// }

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

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
