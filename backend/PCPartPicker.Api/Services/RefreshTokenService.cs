using Microsoft.EntityFrameworkCore;
using PCPartPicker.Infrastructure.Data;
using PCPartPicker.Infrastructure.Identity;
using System.Security.Cryptography;
using System.Text;

namespace PCPartPicker.Api.Services;

public sealed class RefreshTokenService
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _configuration;

    public RefreshTokenService(ApplicationDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public int GetRefreshTokenDays()
    {
        var raw = _configuration["Jwt:RefreshTokenDays"] ?? Environment.GetEnvironmentVariable("JWT_REFRESH_TOKEN_DAYS");
        return int.TryParse(raw, out var days) && days > 0 ? days : 14;
    }

    public async Task<(string Token, DateTimeOffset ExpiresAt)> IssueAsync(ApplicationUser user, string? createdByIp, CancellationToken ct = default)
    {
        var token = GenerateToken();
        var now = DateTimeOffset.UtcNow;
        var expires = now.AddDays(GetRefreshTokenDays());

        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = HashToken(token),
            CreatedAt = now,
            ExpiresAt = expires,
            CreatedByIp = createdByIp,
        };

        _db.RefreshTokens.Add(entity);
        await _db.SaveChangesAsync(ct);
        return (token, expires);
    }

    public async Task<(ApplicationUser User, string NewToken, DateTimeOffset NewExpiresAt)?> RotateAsync(string refreshToken, string? ip, CancellationToken ct = default)
    {
        var tokenHash = HashToken(refreshToken);

        var existing = await _db.RefreshTokens
            .AsTracking()
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, ct);

        if (existing == null)
        {
            return null;
        }

        if (!existing.IsActive)
        {
            return null;
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == existing.UserId, ct);
        if (user == null)
        {
            return null;
        }
        existing.RevokedAt = DateTimeOffset.UtcNow;
        existing.RevokedByIp = ip;

        var (newToken, newExpires) = await IssueAsync(user, ip, ct);

        var newHash = HashToken(newToken);
        var newEntityId = await _db.RefreshTokens
            .Where(rt => rt.TokenHash == newHash)
            .Select(rt => rt.Id)
            .FirstAsync(ct);

        existing.ReplacedByTokenId = newEntityId;

        await _db.SaveChangesAsync(ct);

        return (user, newToken, newExpires);
    }

    public async Task RevokeAsync(string refreshToken, string? ip, CancellationToken ct = default)
    {
        var tokenHash = HashToken(refreshToken);
        var existing = await _db.RefreshTokens.AsTracking().FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, ct);
        if (existing == null) return;

        if (existing.RevokedAt != null) return;

        existing.RevokedAt = DateTimeOffset.UtcNow;
        existing.RevokedByIp = ip;
        await _db.SaveChangesAsync(ct);
    }

    private static string GenerateToken()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Base64UrlEncode(bytes);
    }

    private static string HashToken(string token)
    {
        var bytes = Encoding.UTF8.GetBytes(token);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string Base64UrlEncode(ReadOnlySpan<byte> bytes)
    {
        var base64 = Convert.ToBase64String(bytes);
        return base64.Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }
}
