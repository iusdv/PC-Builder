using Microsoft.EntityFrameworkCore;
using PCPartPicker.Application.DTOs;
using PCPartPicker.Application.Interfaces;
using PCPartPicker.Domain.Entities;
using PCPartPicker.Infrastructure.Data;
using System.Text.Json;

namespace PCPartPicker.Infrastructure.Services;

public class PCPartService : IPCPartService
{
    private readonly AppDbContext _context;

    public PCPartService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<PCPartDto>> GetAllPartsAsync()
    {
        var parts = await _context.PCParts.ToListAsync();
        return parts.Select(MapToDto);
    }

    public async Task<IEnumerable<PCPartDto>> GetPartsByCategoryAsync(string category)
    {
        var parts = await _context.PCParts
            .Where(p => p.Category == category)
            .ToListAsync();
        return parts.Select(MapToDto);
    }

    public async Task<PCPartDto?> GetPartByIdAsync(int id)
    {
        var part = await _context.PCParts.FindAsync(id);
        return part == null ? null : MapToDto(part);
    }

    public async Task<PCPartDto> CreatePartAsync(CreatePCPartDto createPartDto)
    {
        var part = new PCPart
        {
            Name = createPartDto.Name,
            Category = createPartDto.Category,
            Manufacturer = createPartDto.Manufacturer,
            Price = createPartDto.Price,
            PowerConsumption = createPartDto.PowerConsumption,
            ImageUrl = createPartDto.ImageUrl,
            Specifications = JsonSerializer.Serialize(createPartDto.Specifications ?? new Dictionary<string, object>()),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.PCParts.Add(part);
        await _context.SaveChangesAsync();

        return MapToDto(part);
    }

    public async Task<PCPartDto?> UpdatePartAsync(int id, UpdatePCPartDto updatePartDto)
    {
        var part = await _context.PCParts.FindAsync(id);
        if (part == null) return null;

        part.Name = updatePartDto.Name;
        part.Category = updatePartDto.Category;
        part.Manufacturer = updatePartDto.Manufacturer;
        part.Price = updatePartDto.Price;
        part.PowerConsumption = updatePartDto.PowerConsumption;
        part.ImageUrl = updatePartDto.ImageUrl;
        part.Specifications = JsonSerializer.Serialize(updatePartDto.Specifications ?? new Dictionary<string, object>());
        part.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToDto(part);
    }

    public async Task<bool> DeletePartAsync(int id)
    {
        var part = await _context.PCParts.FindAsync(id);
        if (part == null) return false;

        _context.PCParts.Remove(part);
        await _context.SaveChangesAsync();

        return true;
    }

    private PCPartDto MapToDto(PCPart part)
    {
        return new PCPartDto
        {
            Id = part.Id,
            Name = part.Name,
            Category = part.Category,
            Manufacturer = part.Manufacturer,
            Price = part.Price,
            PowerConsumption = part.PowerConsumption,
            ImageUrl = part.ImageUrl,
            Specifications = JsonSerializer.Deserialize<Dictionary<string, object>>(part.Specifications)
        };
    }
}
