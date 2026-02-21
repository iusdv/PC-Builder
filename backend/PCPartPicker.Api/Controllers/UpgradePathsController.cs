using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PCPartPicker.Application.DTOs;
using PCPartPicker.Application.Interfaces;
using PCPartPicker.Infrastructure.Data;

namespace PCPartPicker.Api.Controllers;

[ApiController]
[Route("api/upgrade-paths")]
public class UpgradePathsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IUpgradePathService _upgradePathService;
    private readonly IBottleneckService _bottleneckService;

    public UpgradePathsController(
        ApplicationDbContext db,
        IUpgradePathService upgradePathService,
        IBottleneckService bottleneckService)
    {
        _db = db;
        _upgradePathService = upgradePathService;
        _bottleneckService = bottleneckService;
    }

    /// <summary>
    /// Generate upgrade-path recommendations for a build.
    /// Returns 1-step (immediate), 2-step (short-term), and staged 6–12 month plans.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<UpgradePathResponseDto>> GetUpgradePaths([FromBody] UpgradePathRequestDto request)
    {
        var build = await _db.Builds
            .Include(b => b.CPU)
            .Include(b => b.GPU)
            .Include(b => b.RAM)
            .Include(b => b.Motherboard)
            .Include(b => b.Cooler)
            .Include(b => b.Storage)
            .Include(b => b.PSU)
            .Include(b => b.Case)
            .Include(b => b.CaseFan)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == request.BuildId);

        if (build == null)
            return NotFound(new { message = "Build not found." });

        if (build.CPU == null && build.GPU == null)
            return BadRequest(new { message = "Build needs at least a CPU or GPU to generate upgrade paths." });

        var result = await _upgradePathService.GenerateUpgradePaths(build, request);
        return Ok(result);
    }

    /// <summary>
    /// Return a bottleneck analysis for a build without generating full upgrade paths.
    /// </summary>
    [HttpGet("bottleneck/{buildId:int}")]
    public async Task<ActionResult<BottleneckAnalysisDto>> GetBottleneck(int buildId)
    {
        var build = await _db.Builds
            .Include(b => b.CPU)
            .Include(b => b.GPU)
            .Include(b => b.RAM)
            .Include(b => b.Motherboard)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == buildId);

        if (build == null)
            return NotFound(new { message = "Build not found." });

        var result = _bottleneckService.Analyse(build);
        return Ok(result);
    }
}
