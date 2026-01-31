using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PCPartPicker.Application.Interfaces;
using PCPartPicker.Domain.Entities;
using PCPartPicker.Domain.Enums;
using PCPartPicker.Infrastructure.Data;

namespace PCPartPicker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BuildsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICompatibilityService _compatibilityService;
    private readonly IWattageEstimator _wattageEstimator;

    public BuildsController(
        ApplicationDbContext context,
        ICompatibilityService compatibilityService,
        IWattageEstimator wattageEstimator)
    {
        _context = context;
        _compatibilityService = compatibilityService;
        _wattageEstimator = wattageEstimator;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Build>>> GetBuilds()
    {
        return await _context.Builds
            .Include(b => b.CPU)
            .Include(b => b.Cooler)
            .Include(b => b.Motherboard)
            .Include(b => b.RAM)
            .Include(b => b.GPU)
            .Include(b => b.Storage)
            .Include(b => b.PSU)
            .Include(b => b.Case)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Build>> GetBuild(int id)
    {
        var build = await _context.Builds
            .Include(b => b.CPU)
            .Include(b => b.Cooler)
            .Include(b => b.Motherboard)
            .Include(b => b.RAM)
            .Include(b => b.GPU)
            .Include(b => b.Storage)
            .Include(b => b.PSU)
            .Include(b => b.Case)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (build == null) return NotFound();
        return build;
    }

    [HttpGet("share/{shareCode}")]
    public async Task<ActionResult<Build>> GetBuildByShareCode(string shareCode)
    {
        var build = await _context.Builds
            .Include(b => b.CPU)
            .Include(b => b.Cooler)
            .Include(b => b.Motherboard)
            .Include(b => b.RAM)
            .Include(b => b.GPU)
            .Include(b => b.Storage)
            .Include(b => b.PSU)
            .Include(b => b.Case)
            .FirstOrDefaultAsync(b => b.ShareCode == shareCode);

        if (build == null) return NotFound();
        return build;
    }

    [HttpPost]
    public async Task<ActionResult<Build>> CreateBuild(Build build)
    {
        // Generate unique share code
        build.ShareCode = Guid.NewGuid().ToString("N")[..8];

        // Load related parts
        if (build.CPUId.HasValue)
            build.CPU = await _context.CPUs.FindAsync(build.CPUId.Value);
        if (build.CoolerId.HasValue)
            build.Cooler = await _context.Coolers.FindAsync(build.CoolerId.Value);
        if (build.MotherboardId.HasValue)
            build.Motherboard = await _context.Motherboards.FindAsync(build.MotherboardId.Value);
        if (build.RAMId.HasValue)
            build.RAM = await _context.RAMs.FindAsync(build.RAMId.Value);
        if (build.GPUId.HasValue)
            build.GPU = await _context.GPUs.FindAsync(build.GPUId.Value);
        if (build.StorageId.HasValue)
            build.Storage = await _context.Storages.FindAsync(build.StorageId.Value);
        if (build.PSUId.HasValue)
            build.PSU = await _context.PSUs.FindAsync(build.PSUId.Value);
        if (build.CaseId.HasValue)
            build.Case = await _context.Cases.FindAsync(build.CaseId.Value);

        // Calculate totals
        build.TotalWattage = _wattageEstimator.EstimateTotalWattage(build);
        build.TotalPrice = CalculateTotalPrice(build);

        _context.Builds.Add(build);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBuild), new { id = build.Id }, build);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Build>> UpdateBuild(int id, Build updated)
    {
        var build = await _context.Builds.FirstOrDefaultAsync(b => b.Id == id);
        if (build == null) return NotFound();

        build.Name = updated.Name;
        build.Description = updated.Description;
        build.CPUId = updated.CPUId;
        build.CoolerId = updated.CoolerId;
        build.MotherboardId = updated.MotherboardId;
        build.RAMId = updated.RAMId;
        build.GPUId = updated.GPUId;
        build.StorageId = updated.StorageId;
        build.PSUId = updated.PSUId;
        build.CaseId = updated.CaseId;

        await LoadBuildParts(build);
        build.TotalWattage = _wattageEstimator.EstimateTotalWattage(build);
        build.TotalPrice = CalculateTotalPrice(build);

        await _context.SaveChangesAsync();

        var refreshed = await _context.Builds
            .Include(b => b.CPU)
            .Include(b => b.Cooler)
            .Include(b => b.Motherboard)
            .Include(b => b.RAM)
            .Include(b => b.GPU)
            .Include(b => b.Storage)
            .Include(b => b.PSU)
            .Include(b => b.Case)
            .FirstAsync(b => b.Id == id);

        return Ok(refreshed);
    }

    public sealed class BuildPartSelectionRequest
    {
        public PartCategory Category { get; set; }
        public int? PartId { get; set; }
    }

    [HttpPatch("{id:int}/parts")]
    public async Task<ActionResult<Build>> SelectOrClearPart(int id, [FromBody] BuildPartSelectionRequest request)
    {
        var build = await _context.Builds.FirstOrDefaultAsync(b => b.Id == id);
        if (build == null) return NotFound();

        switch (request.Category)
        {
            case PartCategory.CPU:
                build.CPUId = request.PartId;
                break;
            case PartCategory.Cooler:
                build.CoolerId = request.PartId;
                break;
            case PartCategory.Motherboard:
                build.MotherboardId = request.PartId;
                break;
            case PartCategory.RAM:
                build.RAMId = request.PartId;
                break;
            case PartCategory.GPU:
                build.GPUId = request.PartId;
                break;
            case PartCategory.Storage:
                build.StorageId = request.PartId;
                break;
            case PartCategory.PSU:
                build.PSUId = request.PartId;
                break;
            case PartCategory.Case:
                build.CaseId = request.PartId;
                break;
            default:
                return BadRequest(new { message = "Unsupported category." });
        }

        if (request.PartId.HasValue)
        {
            var exists = await PartExists(request.Category, request.PartId.Value);
            if (!exists)
            {
                return BadRequest(new { message = "Selected part does not exist for the given category." });
            }
        }

        await LoadBuildParts(build);
        build.TotalWattage = _wattageEstimator.EstimateTotalWattage(build);
        build.TotalPrice = CalculateTotalPrice(build);

        await _context.SaveChangesAsync();

        var refreshed = await _context.Builds
            .Include(b => b.CPU)
            .Include(b => b.Cooler)
            .Include(b => b.Motherboard)
            .Include(b => b.RAM)
            .Include(b => b.GPU)
            .Include(b => b.Storage)
            .Include(b => b.PSU)
            .Include(b => b.Case)
            .FirstAsync(b => b.Id == id);

        return Ok(refreshed);
    }

    [HttpPost("{id}/check-compatibility")]
    public async Task<ActionResult> CheckCompatibility(int id)
    {
        var build = await _context.Builds
            .Include(b => b.CPU)
            .Include(b => b.Cooler)
            .Include(b => b.Motherboard)
            .Include(b => b.RAM)
            .Include(b => b.GPU)
            .Include(b => b.Storage)
            .Include(b => b.PSU)
            .Include(b => b.Case)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (build == null) return NotFound();

        var result = _compatibilityService.CheckCompatibility(build);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBuild(int id)
    {
        var build = await _context.Builds.FindAsync(id);
        if (build == null) return NotFound();

        _context.Builds.Remove(build);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private decimal CalculateTotalPrice(Build build)
    {
        decimal total = 0;
        if (build.CPU != null) total += build.CPU.Price;
        if (build.Cooler != null) total += build.Cooler.Price;
        if (build.Motherboard != null) total += build.Motherboard.Price;
        if (build.RAM != null) total += build.RAM.Price;
        if (build.GPU != null) total += build.GPU.Price;
        if (build.Storage != null) total += build.Storage.Price;
        if (build.PSU != null) total += build.PSU.Price;
        if (build.Case != null) total += build.Case.Price;
        return total;
    }

    private async Task LoadBuildParts(Build build)
    {
        build.CPU = build.CPUId.HasValue ? await _context.CPUs.FindAsync(build.CPUId.Value) : null;
        build.Cooler = build.CoolerId.HasValue ? await _context.Coolers.FindAsync(build.CoolerId.Value) : null;
        build.Motherboard = build.MotherboardId.HasValue ? await _context.Motherboards.FindAsync(build.MotherboardId.Value) : null;
        build.RAM = build.RAMId.HasValue ? await _context.RAMs.FindAsync(build.RAMId.Value) : null;
        build.GPU = build.GPUId.HasValue ? await _context.GPUs.FindAsync(build.GPUId.Value) : null;
        build.Storage = build.StorageId.HasValue ? await _context.Storages.FindAsync(build.StorageId.Value) : null;
        build.PSU = build.PSUId.HasValue ? await _context.PSUs.FindAsync(build.PSUId.Value) : null;
        build.Case = build.CaseId.HasValue ? await _context.Cases.FindAsync(build.CaseId.Value) : null;
    }

    private Task<bool> PartExists(PartCategory category, int partId)
    {
        return category switch
        {
            PartCategory.CPU => _context.CPUs.AnyAsync(p => p.Id == partId),
            PartCategory.Cooler => _context.Coolers.AnyAsync(p => p.Id == partId),
            PartCategory.Motherboard => _context.Motherboards.AnyAsync(p => p.Id == partId),
            PartCategory.RAM => _context.RAMs.AnyAsync(p => p.Id == partId),
            PartCategory.GPU => _context.GPUs.AnyAsync(p => p.Id == partId),
            PartCategory.Storage => _context.Storages.AnyAsync(p => p.Id == partId),
            PartCategory.PSU => _context.PSUs.AnyAsync(p => p.Id == partId),
            PartCategory.Case => _context.Cases.AnyAsync(p => p.Id == partId),
            _ => Task.FromResult(false)
        };
    }
}
