using Microsoft.EntityFrameworkCore;
using PCPartPicker.Application.DTOs;
using PCPartPicker.Application.Interfaces;
using PCPartPicker.Domain.Entities;
using PCPartPicker.Infrastructure.Data;
using System.Text.Json;

namespace PCPartPicker.Infrastructure.Services;

public class BuildService : IBuildService
{
    private readonly AppDbContext _context;

    public BuildService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<BuildDto>> GetUserBuildsAsync(int userId)
    {
        var builds = await _context.Builds
            .Include(b => b.BuildParts)
            .ThenInclude(bp => bp.PCPart)
            .Where(b => b.UserId == userId)
            .ToListAsync();

        return builds.Select(MapToDto);
    }

    public async Task<BuildDto?> GetBuildByIdAsync(int buildId, int userId)
    {
        var build = await _context.Builds
            .Include(b => b.BuildParts)
            .ThenInclude(bp => bp.PCPart)
            .FirstOrDefaultAsync(b => b.Id == buildId && b.UserId == userId);

        return build == null ? null : MapToDto(build);
    }

    public async Task<BuildDto?> GetBuildByShareTokenAsync(string shareToken)
    {
        var build = await _context.Builds
            .Include(b => b.BuildParts)
            .ThenInclude(bp => bp.PCPart)
            .FirstOrDefaultAsync(b => b.ShareToken == shareToken);

        return build == null ? null : MapToDto(build);
    }

    public async Task<BuildDto> CreateBuildAsync(int userId, CreateBuildDto createBuildDto)
    {
        var build = new Build
        {
            Name = createBuildDto.Name,
            Description = createBuildDto.Description,
            UserId = userId,
            ShareToken = Guid.NewGuid().ToString("N"),
            TotalPrice = 0,
            TotalWattage = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Builds.Add(build);
        await _context.SaveChangesAsync();

        return MapToDto(build);
    }

    public async Task<BuildDto?> AddPartToBuildAsync(int buildId, int userId, AddPartToBuildDto addPartDto)
    {
        var build = await _context.Builds
            .Include(b => b.BuildParts)
            .ThenInclude(bp => bp.PCPart)
            .FirstOrDefaultAsync(b => b.Id == buildId && b.UserId == userId);

        if (build == null) return null;

        var part = await _context.PCParts.FindAsync(addPartDto.PCPartId);
        if (part == null) return null;

        var existingBuildPart = build.BuildParts
            .FirstOrDefault(bp => bp.PCPartId == addPartDto.PCPartId);

        if (existingBuildPart != null)
        {
            existingBuildPart.Quantity = addPartDto.Quantity;
        }
        else
        {
            var buildPart = new BuildPart
            {
                BuildId = buildId,
                PCPartId = addPartDto.PCPartId,
                Quantity = addPartDto.Quantity
            };
            _context.BuildParts.Add(buildPart);
        }

        RecalculateTotals(build);
        build.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToDto(build);
    }

    public async Task<bool> RemovePartFromBuildAsync(int buildId, int userId, int partId)
    {
        var build = await _context.Builds
            .Include(b => b.BuildParts)
            .ThenInclude(bp => bp.PCPart)
            .FirstOrDefaultAsync(b => b.Id == buildId && b.UserId == userId);

        if (build == null) return false;

        var buildPart = build.BuildParts.FirstOrDefault(bp => bp.PCPartId == partId);
        if (buildPart == null) return false;

        _context.BuildParts.Remove(buildPart);
        RecalculateTotals(build);
        build.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteBuildAsync(int buildId, int userId)
    {
        var build = await _context.Builds
            .FirstOrDefaultAsync(b => b.Id == buildId && b.UserId == userId);

        if (build == null) return false;

        _context.Builds.Remove(build);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<IEnumerable<CompatibilityWarning>> CheckCompatibilityAsync(int buildId)
    {
        var build = await _context.Builds
            .Include(b => b.BuildParts)
            .ThenInclude(bp => bp.PCPart)
            .FirstOrDefaultAsync(b => b.Id == buildId);

        if (build == null) return new List<CompatibilityWarning>();

        var warnings = new List<CompatibilityWarning>();

        var parts = build.BuildParts.Select(bp => bp.PCPart).ToList();
        var cpu = parts.FirstOrDefault(p => p.Category == "CPU");
        var motherboard = parts.FirstOrDefault(p => p.Category == "Motherboard");
        var psu = parts.FirstOrDefault(p => p.Category == "PSU");

        if (cpu != null && motherboard != null)
        {
            var cpuSpecs = JsonSerializer.Deserialize<Dictionary<string, object>>(cpu.Specifications);
            var mbSpecs = JsonSerializer.Deserialize<Dictionary<string, object>>(motherboard.Specifications);

            if (cpuSpecs != null && mbSpecs != null)
            {
                var cpuSocket = cpuSpecs.ContainsKey("socket") ? cpuSpecs["socket"]?.ToString() : null;
                var mbSocket = mbSpecs.ContainsKey("socket") ? mbSpecs["socket"]?.ToString() : null;

                if (cpuSocket != null && mbSocket != null && cpuSocket != mbSocket)
                {
                    warnings.Add(new CompatibilityWarning
                    {
                        Type = "Socket Mismatch",
                        Message = $"CPU socket ({cpuSocket}) does not match Motherboard socket ({mbSocket})",
                        Severity = "Error"
                    });
                }
            }
        }

        if (psu != null && build.TotalWattage > 0)
        {
            var psuSpecs = JsonSerializer.Deserialize<Dictionary<string, object>>(psu.Specifications);
            if (psuSpecs != null && psuSpecs.ContainsKey("wattage"))
            {
                var psuWattage = Convert.ToInt32(psuSpecs["wattage"]);
                var recommendedWattage = build.TotalWattage * 1.2;

                if (psuWattage < recommendedWattage)
                {
                    warnings.Add(new CompatibilityWarning
                    {
                        Type = "Power Supply",
                        Message = $"PSU wattage ({psuWattage}W) may be insufficient. Recommended: {recommendedWattage:F0}W",
                        Severity = "Warning"
                    });
                }
            }
        }

        return warnings;
    }

    private void RecalculateTotals(Build build)
    {
        build.TotalPrice = build.BuildParts.Sum(bp => bp.PCPart.Price * bp.Quantity);
        build.TotalWattage = build.BuildParts.Sum(bp => bp.PCPart.PowerConsumption * bp.Quantity);
    }

    private BuildDto MapToDto(Build build)
    {
        return new BuildDto
        {
            Id = build.Id,
            Name = build.Name,
            Description = build.Description,
            ShareToken = build.ShareToken,
            TotalPrice = build.TotalPrice,
            TotalWattage = build.TotalWattage,
            CreatedAt = build.CreatedAt,
            Parts = build.BuildParts.Select(bp => new BuildPartDto
            {
                Part = new PCPartDto
                {
                    Id = bp.PCPart.Id,
                    Name = bp.PCPart.Name,
                    Category = bp.PCPart.Category,
                    Manufacturer = bp.PCPart.Manufacturer,
                    Price = bp.PCPart.Price,
                    PowerConsumption = bp.PCPart.PowerConsumption,
                    ImageUrl = bp.PCPart.ImageUrl,
                    Specifications = JsonSerializer.Deserialize<Dictionary<string, object>>(bp.PCPart.Specifications)
                },
                Quantity = bp.Quantity
            }).ToList()
        };
    }
}
