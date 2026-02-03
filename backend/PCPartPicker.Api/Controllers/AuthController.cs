using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using PCPartPicker.Api.Services;
using PCPartPicker.Infrastructure.Identity;

namespace PCPartPicker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string RefreshTokenCookieName = "pcpp_refresh";

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtTokenService _jwtTokenService;
    private readonly RefreshTokenService _refreshTokenService;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        JwtTokenService jwtTokenService,
        RefreshTokenService refreshTokenService)
    {
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
    }

    public sealed record RegisterRequest(string Email, string Password, string? UserName = null);
    public sealed record LoginRequest(string Email, string Password);

    public sealed record AuthResponse(
        string AccessToken,
        long ExpiresInSeconds,
        DateTimeOffset ExpiresAt,
        string UserId,
        string? Email,
        string? UserName,
        string Role);

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var email = request.Email.Trim();
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email and password are required." });
            }

            var existing = await _userManager.FindByEmailAsync(email);
            if (existing != null)
            {
                return Conflict(new { message = "An account with this email already exists." });
            }

            var user = new ApplicationUser
            {
                Email = email,
                UserName = string.IsNullOrWhiteSpace(request.UserName) ? email : request.UserName.Trim(),
                Role = "user",
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return BadRequest(new
                {
                    message = "Registration failed.",
                    errors = result.Errors.Select(e => new { e.Code, e.Description })
                });
            }

            var (refreshToken, refreshExpiresAt) = await _refreshTokenService.IssueAsync(user, GetClientIp());
            SetRefreshTokenCookie(refreshToken, refreshExpiresAt);

            var token = _jwtTokenService.CreateAccessToken(user);
            return Ok(new AuthResponse(
                AccessToken: token.Token,
                ExpiresInSeconds: (long)(token.ExpiresAt - DateTimeOffset.UtcNow).TotalSeconds,
                ExpiresAt: token.ExpiresAt,
                UserId: user.Id,
                Email: user.Email,
                UserName: user.UserName,
                Role: user.Role));
        }
        catch (MySqlException ex) when (ex.Message.Contains("doesn't exist", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database schema is missing Identity tables (migrations not applied)."
            });
        }
        catch (MySqlException ex) when (ex.Message.Contains("is full", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status507InsufficientStorage, new
            {
                message = "Database storage quota is full; cannot create Identity tables/users on this database."
            });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        try
        {
            var email = request.Email.Trim();
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email and password are required." });
            }

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                return Unauthorized(new { message = "Invalid credentials." });
            }

            var valid = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!valid)
            {
                return Unauthorized(new { message = "Invalid credentials." });
            }

            var (refreshToken, refreshExpiresAt) = await _refreshTokenService.IssueAsync(user, GetClientIp());
            SetRefreshTokenCookie(refreshToken, refreshExpiresAt);

            var token = _jwtTokenService.CreateAccessToken(user);
            return Ok(new AuthResponse(
                AccessToken: token.Token,
                ExpiresInSeconds: (long)(token.ExpiresAt - DateTimeOffset.UtcNow).TotalSeconds,
                ExpiresAt: token.ExpiresAt,
                UserId: user.Id,
                Email: user.Email,
                UserName: user.UserName,
                Role: user.Role));
        }
        catch (MySqlException ex) when (ex.Message.Contains("doesn't exist", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database schema is missing Identity tables (migrations not applied)."
            });
        }
        catch (MySqlException ex) when (ex.Message.Contains("is full", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status507InsufficientStorage, new
            {
                message = "Database storage quota is full; cannot use auth on this database."
            });
        }
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh()
    {
        try
        {
            if (!Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refreshToken) || string.IsNullOrWhiteSpace(refreshToken))
            {
                return Unauthorized(new { message = "Missing refresh token." });
            }

            var rotated = await _refreshTokenService.RotateAsync(refreshToken, GetClientIp());
            if (rotated == null)
            {
                ClearRefreshTokenCookie();
                return Unauthorized(new { message = "Invalid refresh token." });
            }

            SetRefreshTokenCookie(rotated.Value.NewToken, rotated.Value.NewExpiresAt);

            var access = _jwtTokenService.CreateAccessToken(rotated.Value.User);
            return Ok(new AuthResponse(
                AccessToken: access.Token,
                ExpiresInSeconds: (long)(access.ExpiresAt - DateTimeOffset.UtcNow).TotalSeconds,
                ExpiresAt: access.ExpiresAt,
                UserId: rotated.Value.User.Id,
                Email: rotated.Value.User.Email,
                UserName: rotated.Value.User.UserName,
                Role: rotated.Value.User.Role));
        }
        catch (MySqlException ex) when (ex.Message.Contains("doesn't exist", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database schema is missing auth tables (migrations not applied)."
            });
        }
        catch (MySqlException ex) when (ex.Message.Contains("is full", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status507InsufficientStorage, new
            {
                message = "Database storage quota is full; cannot use auth on this database."
            });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        if (Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refreshToken) && !string.IsNullOrWhiteSpace(refreshToken))
        {
            await _refreshTokenService.RevokeAsync(refreshToken, GetClientIp());
        }

        ClearRefreshTokenCookie();
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult> Me()
    {
        var userId = _userManager.GetUserId(User);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return Unauthorized();
        }

        return Ok(new { user.Id, user.Email, user.UserName, user.Role });
    }

    private void SetRefreshTokenCookie(string token, DateTimeOffset expiresAt)
    {
        var isHttps = Request.IsHttps;
        var options = new CookieOptions
        {
            HttpOnly = true,
            Secure = isHttps,
            SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax,
            Expires = expiresAt.UtcDateTime,
            Path = "/",
        };

        Response.Cookies.Append(RefreshTokenCookieName, token, options);
    }

    private void ClearRefreshTokenCookie()
    {
        Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions { Path = "/" });
    }

    private string? GetClientIp()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
