using PCPartPicker.Application.DTOs;

namespace PCPartPicker.Application.Interfaces;

public interface IPCPartService
{
    Task<IEnumerable<PCPartDto>> GetAllPartsAsync();
    Task<IEnumerable<PCPartDto>> GetPartsByCategoryAsync(string category);
    Task<PCPartDto?> GetPartByIdAsync(int id);
    Task<PCPartDto> CreatePartAsync(CreatePCPartDto createPartDto);
    Task<PCPartDto?> UpdatePartAsync(int id, UpdatePCPartDto updatePartDto);
    Task<bool> DeletePartAsync(int id);
}
