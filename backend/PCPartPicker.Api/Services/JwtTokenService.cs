using Microsoft.IdentityModel.Tokens;
using PCPartPicker.Infrastructure.Identity;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace PCPartPicker.Api.Services;

public sealed class JwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTimeOffset ExpiresAt) CreateAccessToken(ApplicationUser user, IList<string>? roles = null)
    {
        var jwtSection = _configuration.GetSection("Jwt");

        var key = jwtSection["Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("Missing JWT signing key. Configure Jwt:Key or JWT_KEY.");
        }

        var issuer = jwtSection["Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER");
        var audience = jwtSection["Audience"] ?? Environment.GetEnvironmentVariable("JWT_AUDIENCE");

        var expiryMinutesRaw = jwtSection["ExpiryMinutes"] ?? Environment.GetEnvironmentVariable("JWT_EXPIRY_MINUTES");
        var expiryMinutes = 60;
        if (!string.IsNullOrWhiteSpace(expiryMinutesRaw) && int.TryParse(expiryMinutesRaw, out var parsed) && parsed > 0)
        {
            expiryMinutes = parsed;
        }

        var now = DateTimeOffset.UtcNow;
        var expires = now.AddMinutes(expiryMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(ClaimTypes.NameIdentifier, user.Id),
        };

        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            claims.Add(new Claim(ClaimTypes.Email, user.Email));
        }

        if (!string.IsNullOrWhiteSpace(user.UserName))
        {
            claims.Add(new Claim(ClaimTypes.Name, user.UserName));
        }

        if (!string.IsNullOrWhiteSpace(user.Role))
        {
            claims.Add(new Claim(ClaimTypes.Role, user.Role));
        }

        if (roles != null)
        {
            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }
        }

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expires.UtcDateTime,
            signingCredentials: creds);

        var encoded = new JwtSecurityTokenHandler().WriteToken(token);
        return (encoded, expires);
    }
}
