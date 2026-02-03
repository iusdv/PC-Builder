using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using MySqlConnector;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;

namespace PCPartPicker.Infrastructure.Data;

public sealed class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var basePath = Directory.GetCurrentDirectory();

        // Keep EF tooling consistent with runtime: load backend/PCPartPicker.Api/.env if present.
        // This avoids dotnet-ef accidentally using an old appsettings.json connection string.
        LoadDotEnvIfPresent(basePath);

        var configuration = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddJsonFile(Path.Combine("..", "PCPartPicker.Api", "appsettings.json"), optional: true)
            .AddJsonFile(Path.Combine("..", "PCPartPicker.Api", "appsettings.Development.json"), optional: true)
            .AddEnvironmentVariables()
            .Build();

        // Match runtime behavior: prefer env/.env variables over appsettings.json.
        var connectionString =
            configuration["DATABASE_CONNECTION_STRING"]
            ?? BuildFromDiscreteEnvVars()
            ?? configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "No database connection string found for design-time context creation. " +
                "Set DATABASE_CONNECTION_STRING or ConnectionStrings:DefaultConnection.");
        }

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        var serverVersionRaw =
            configuration["DATABASE_SERVER_VERSION"]
            ?? Environment.GetEnvironmentVariable("DATABASE_SERVER_VERSION");

        ServerVersion serverVersion = string.IsNullOrWhiteSpace(serverVersionRaw)
            ? new MySqlServerVersion(new Version(8, 0, 0))
            : ServerVersion.Parse(serverVersionRaw);

        optionsBuilder.UseMySql(connectionString, serverVersion);

        return new ApplicationDbContext(optionsBuilder.Options);
    }

    private static void LoadDotEnvIfPresent(string basePath)
    {
        var candidates = new[]
        {
            Path.Combine(basePath, ".env"),
            Path.Combine(basePath, "..", "PCPartPicker.Api", ".env"),
            Path.Combine(basePath, "PCPartPicker.Api", ".env"),
        };

        foreach (var path in candidates)
        {
            if (!File.Exists(path))
            {
                continue;
            }

            foreach (var rawLine in File.ReadAllLines(path))
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

            // First .env found wins.
            return;
        }
    }

    private static string? BuildFromDiscreteEnvVars()
    {
        var host = Environment.GetEnvironmentVariable("DATABASE_HOST");
        var portRaw = Environment.GetEnvironmentVariable("DATABASE_PORT");
        var database = Environment.GetEnvironmentVariable("DATABASE_NAME");
        var username = Environment.GetEnvironmentVariable("DATABASE_USER");
        var password = Environment.GetEnvironmentVariable("DATABASE_PASSWORD") ?? string.Empty;

        if (string.IsNullOrWhiteSpace(host)
            || string.IsNullOrWhiteSpace(portRaw)
            || string.IsNullOrWhiteSpace(database)
            || string.IsNullOrWhiteSpace(username)
            || !uint.TryParse(portRaw, out var port)
            || port == 0)
        {
            return null;
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

        return csb.ConnectionString;
    }
}
