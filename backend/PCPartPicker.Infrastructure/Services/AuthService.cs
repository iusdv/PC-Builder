using Microsoft.EntityFrameworkCore;
using PCPartPicker.Application.DTOs;
using PCPartPicker.Application.Interfaces;
using PCPartPicker.Domain.Entities;
using PCPartPicker.Infrastructure.Data;
using System.Security.Cryptography;
using System.Text;

namespace PCPartPicker.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly string _jwtSecret;

    public AuthService(AppDbContext context, string jwtSecret)
    {
        _context = context;
        _jwtSecret = jwtSecret;
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto loginDto)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == loginDto.Username);

        if (user == null || !VerifyPassword(loginDto.Password, user.PasswordHash))
            return null;

        return new AuthResponseDto
        {
            Token = GenerateToken(user),
            Username = user.Username,
            IsAdmin = user.IsAdmin
        };
    }

    public async Task<AuthResponseDto?> RegisterAsync(RegisterDto registerDto)
    {
        if (await _context.Users.AnyAsync(u => u.Username == registerDto.Username))
            return null;

        if (await _context.Users.AnyAsync(u => u.Email == registerDto.Email))
            return null;

        var user = new User
        {
            Username = registerDto.Username,
            Email = registerDto.Email,
            PasswordHash = HashPassword(registerDto.Password),
            IsAdmin = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return new AuthResponseDto
        {
            Token = GenerateToken(user),
            Username = user.Username,
            IsAdmin = user.IsAdmin
        };
    }

    private string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }

    private bool VerifyPassword(string password, string hash)
    {
        var hashedPassword = HashPassword(password);
        return hashedPassword == hash;
    }

    private string GenerateToken(User user)
    {
        return Convert.ToBase64String(Encoding.UTF8.GetBytes($"{user.Id}:{user.Username}:{user.IsAdmin}:{_jwtSecret}"));
    }
}
