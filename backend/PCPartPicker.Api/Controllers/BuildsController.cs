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
        var builds = await _context.Builds.AsNoTracking().ToListAsync();
        if (builds.Count == 0) return builds;

        var ids = new HashSet<int>();
        void Add(int? id)
        {
            if (id.HasValue) ids.Add(id.Value);
        }

        foreach (var build in builds)
        {
            Add(build.CPUId);
            Add(build.CoolerId);
            Add(build.MotherboardId);
            Add(build.RAMId);
            Add(build.GPUId);
            Add(build.StorageId);
            Add(build.PSUId);
            Add(build.CaseId);
            Add(build.CaseFanId);
        }

        if (ids.Count == 0) return builds;

        var parts = await _context.Set<Part>()
            .AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .ToListAsync();

        var byId = parts.ToDictionary(p => p.Id);
        foreach (var build in builds)
        {
            build.CPU = build.CPUId.HasValue && byId.TryGetValue(build.CPUId.Value, out var cpu) ? cpu as CPU : null;
            build.Cooler = build.CoolerId.HasValue && byId.TryGetValue(build.CoolerId.Value, out var cooler) ? cooler as Cooler : null;
            build.Motherboard = build.MotherboardId.HasValue && byId.TryGetValue(build.MotherboardId.Value, out var motherboard) ? motherboard as Motherboard : null;
            build.RAM = build.RAMId.HasValue && byId.TryGetValue(build.RAMId.Value, out var ram) ? ram as RAM : null;
            build.GPU = build.GPUId.HasValue && byId.TryGetValue(build.GPUId.Value, out var gpu) ? gpu as GPU : null;
            build.Storage = build.StorageId.HasValue && byId.TryGetValue(build.StorageId.Value, out var storage) ? storage as Storage : null;
            build.PSU = build.PSUId.HasValue && byId.TryGetValue(build.PSUId.Value, out var psu) ? psu as PSU : null;
            build.Case = build.CaseId.HasValue && byId.TryGetValue(build.CaseId.Value, out var pcCase) ? pcCase as Case : null;
            build.CaseFan = build.CaseFanId.HasValue && byId.TryGetValue(build.CaseFanId.Value, out var fan) ? fan as CaseFan : null;
        }

        return builds;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Build>> GetBuild(int id)
    {
        var build = await _context.Builds.FirstOrDefaultAsync(b => b.Id == id);

        if (build == null) return NotFound();
        await LoadBuildParts(build);
        return build;
    }

    [HttpGet("share/{shareCode}")]
    public async Task<ActionResult<Build>> GetBuildByShareCode(string shareCode)
    {
        var build = await _context.Builds.FirstOrDefaultAsync(b => b.ShareCode == shareCode);

        if (build == null) return NotFound();
        await LoadBuildParts(build);
        return build;
    }

    [HttpPost]
    public async Task<ActionResult<Build>> CreateBuild(Build build)
    {
        // Generate unique share code
        build.ShareCode = Guid.NewGuid().ToString("N")[..8];

        await LoadBuildParts(build);

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
        build.CaseFanId = updated.CaseFanId;

        await LoadBuildParts(build);
        build.TotalWattage = _wattageEstimator.EstimateTotalWattage(build);
        build.TotalPrice = CalculateTotalPrice(build);

        await _context.SaveChangesAsync();

        return Ok(build);
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
            case PartCategory.CaseFan:
                build.CaseFanId = request.PartId;
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

        return Ok(build);
    }

    [HttpPost("{id}/check-compatibility")]
    public async Task<ActionResult> CheckCompatibility(int id)
    {
        var build = await _context.Builds.FirstOrDefaultAsync(b => b.Id == id);

        if (build == null) return NotFound();

        await LoadBuildParts(build);

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
        if (build.CaseFan != null) total += build.CaseFan.Price;
        return total;
    }

    private async Task LoadBuildParts(Build build)
    {
        var ids = new List<int>(capacity: 9);
        void AddId(int? id)
        {
            if (id.HasValue) ids.Add(id.Value);
        }

        AddId(build.CPUId);
        AddId(build.CoolerId);
        AddId(build.MotherboardId);
        AddId(build.RAMId);
        AddId(build.GPUId);
        AddId(build.StorageId);
        AddId(build.PSUId);
        AddId(build.CaseId);
        AddId(build.CaseFanId);

        if (ids.Count == 0)
        {
            build.CPU = null;
            build.Cooler = null;
            build.Motherboard = null;
            build.RAM = null;
            build.GPU = null;
            build.Storage = null;
            build.PSU = null;
            build.Case = null;
            build.CaseFan = null;
            return;
        }

        var parts = await _context.Set<Part>()
            .Where(p => ids.Contains(p.Id))
            .ToListAsync();

        var byId = parts.ToDictionary(p => p.Id);

        build.CPU = build.CPUId.HasValue && byId.TryGetValue(build.CPUId.Value, out var cpu) ? cpu as CPU : null;
        build.Cooler = build.CoolerId.HasValue && byId.TryGetValue(build.CoolerId.Value, out var cooler) ? cooler as Cooler : null;
        build.Motherboard = build.MotherboardId.HasValue && byId.TryGetValue(build.MotherboardId.Value, out var motherboard) ? motherboard as Motherboard : null;
        build.RAM = build.RAMId.HasValue && byId.TryGetValue(build.RAMId.Value, out var ram) ? ram as RAM : null;
        build.GPU = build.GPUId.HasValue && byId.TryGetValue(build.GPUId.Value, out var gpu) ? gpu as GPU : null;
        build.Storage = build.StorageId.HasValue && byId.TryGetValue(build.StorageId.Value, out var storage) ? storage as Storage : null;
        build.PSU = build.PSUId.HasValue && byId.TryGetValue(build.PSUId.Value, out var psu) ? psu as PSU : null;
        build.Case = build.CaseId.HasValue && byId.TryGetValue(build.CaseId.Value, out var pcCase) ? pcCase as Case : null;
        build.CaseFan = build.CaseFanId.HasValue && byId.TryGetValue(build.CaseFanId.Value, out var fan) ? fan as CaseFan : null;
    }

    private Task<bool> PartExists(PartCategory category, int partId)
    {
        return _context.Set<Part>().AnyAsync(p => p.Id == partId && p.Category == category);
    }
}
