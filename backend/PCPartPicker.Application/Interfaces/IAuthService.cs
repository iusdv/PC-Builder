using PCPartPicker.Application.DTOs;

namespace PCPartPicker.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto?> LoginAsync(LoginDto loginDto);
    Task<AuthResponseDto?> RegisterAsync(RegisterDto registerDto);
}
