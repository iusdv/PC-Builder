using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PCPartPicker.Application.Interfaces;
using PCPartPicker.Domain.Entities;
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

    [HttpPost("{id}/check-compatibility")]
    public async Task<ActionResult> CheckCompatibility(int id)
    {
        var build = await _context.Builds
            .Include(b => b.CPU)
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
        if (build.Motherboard != null) total += build.Motherboard.Price;
        if (build.RAM != null) total += build.RAM.Price;
        if (build.GPU != null) total += build.GPU.Price;
        if (build.Storage != null) total += build.Storage.Price;
        if (build.PSU != null) total += build.PSU.Price;
        if (build.Case != null) total += build.Case.Price;
        return total;
    }
}
