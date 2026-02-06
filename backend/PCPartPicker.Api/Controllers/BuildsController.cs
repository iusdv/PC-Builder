using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PCPartPicker.Application.Interfaces;
using PCPartPicker.Domain.Entities;
using PCPartPicker.Domain.Enums;
using PCPartPicker.Infrastructure.Data;
using System.Security.Cryptography;
using System.Security.Claims;

namespace PCPartPicker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BuildsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICompatibilityService _compatibilityService;
    private readonly IWattageEstimator _wattageEstimator;
    private readonly IHostEnvironment _environment;

    private bool BuildOwnershipEnabled
    {
        get
        {
            var raw = Environment.GetEnvironmentVariable("FEATURE_BUILD_OWNERSHIP");
            if (!string.IsNullOrWhiteSpace(raw))
            {
                return string.Equals(raw, "true", StringComparison.OrdinalIgnoreCase);
            }
            return _environment.IsDevelopment();
        }
    }

    public BuildsController(
        ApplicationDbContext context,
        ICompatibilityService compatibilityService,
        IWattageEstimator wattageEstimator,
        IHostEnvironment environment)
    {
        _context = context;
        _compatibilityService = compatibilityService;
        _wattageEstimator = wattageEstimator;
        _environment = environment;
    }

    private const int ShareCodeLength = 6;
    private static readonly char[] ShareCodeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".ToCharArray();

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Build>>> GetBuilds()
    {
        var query = _context.Builds.AsNoTracking();
        if (BuildOwnershipEnabled)
        {
            query = query.Where(b => b.UserId == null);
        }

        var builds = await query.ToListAsync();
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

    [Authorize]
    [HttpGet("mine")]
    public async Task<ActionResult<IEnumerable<Build>>> GetMyBuilds()
    {
        if (!BuildOwnershipEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Build ownership is disabled on this server." });
        }

        var userId = GetCurrentUserId();
        var builds = await _context.Builds.AsNoTracking().Where(b => b.UserId == userId).ToListAsync();
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

    [Authorize]
    [HttpPost("{id:int}/save")]
    public async Task<ActionResult<Build>> SaveBuildToAccount(int id)
    {
        if (!BuildOwnershipEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Build ownership is disabled on this server." });
        }

        var userId = GetCurrentUserId();

        var build = await _context.Builds.FirstOrDefaultAsync(b => b.Id == id);
        if (build == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(build.UserId) && !string.Equals(build.UserId, userId, StringComparison.Ordinal))
        {
            return Forbid();
        }
        if (string.IsNullOrWhiteSpace(build.UserId))
        {
            build.UserId = userId;
        }

        await _context.SaveChangesAsync();

        await LoadBuildParts(build);
        return Ok(build);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Build>> GetBuild(int id)
    {
        var build = await _context.Builds.FirstOrDefaultAsync(b => b.Id == id);

        if (build == null) return NotFound();

        var ownership = EnsureCanAccess(build);
        if (ownership != null) return ownership;

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
        // Draft builds are not saved to an account until the user explicitly presses "Save Build".
        // We therefore keep drafts anonymous (unowned) on creation.
        build.UserId = null;
        build.ShareCode = await GenerateUniqueShareCodeAsync();

        await LoadBuildParts(build);

        // Calculate totals
        build.TotalWattage = _wattageEstimator.EstimateTotalWattage(build);
        build.TotalPrice = CalculateTotalPrice(build);

        _context.Builds.Add(build);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBuild), new { id = build.Id }, build);
    }

    private static string GenerateShareCode(int length)
    {
        Span<byte> bytes = stackalloc byte[length];
        RandomNumberGenerator.Fill(bytes);

        Span<char> chars = stackalloc char[length];
        for (var i = 0; i < length; i++)
        {
            chars[i] = ShareCodeAlphabet[bytes[i] % ShareCodeAlphabet.Length];
        }
        return new string(chars);
    }

    private async Task<string> GenerateUniqueShareCodeAsync()
    {
        // Collisions are unlikely but possible with short codes; retry a few times.
        for (var attempt = 0; attempt < 10; attempt++)
        {
            var code = GenerateShareCode(ShareCodeLength);
            var exists = await _context.Builds.AsNoTracking().AnyAsync(b => b.ShareCode == code);
            if (!exists) return code;
        }

        // Fallback to a longer code if we're extremely unlucky.
        for (var attempt = 0; attempt < 10; attempt++)
        {
            var code = GenerateShareCode(ShareCodeLength + 2);
            var exists = await _context.Builds.AsNoTracking().AnyAsync(b => b.ShareCode == code);
            if (!exists) return code;
        }

        throw new InvalidOperationException("Failed to generate a unique share code.");
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Build>> UpdateBuild(int id, Build updated)
    {
        var build = await _context.Builds.FirstOrDefaultAsync(b => b.Id == id);
        if (build == null) return NotFound();

        var ownership = EnsureCanAccess(build);
        if (ownership != null) return ownership;

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

        var ownership = EnsureCanAccess(build);
        if (ownership != null) return ownership;

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

        var ownership = EnsureCanAccess(build);
        if (ownership != null) return ownership;

        await LoadBuildParts(build);

        var result = _compatibilityService.CheckCompatibility(build);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBuild(int id)
    {
        var build = await _context.Builds.FindAsync(id);
        if (build == null) return NotFound();

        var ownership = EnsureCanAccess(build);
        if (ownership != null) return ownership;

        _context.Builds.Remove(build);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private string GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new InvalidOperationException("Authenticated request is missing NameIdentifier claim.");
        }

        return userId;
    }

    private ActionResult? EnsureCanAccess(Build build)
    {
        if (!BuildOwnershipEnabled)
        {
            return null;
        }

        // Anonymous builds are accessible to everyone.
        if (string.IsNullOrWhiteSpace(build.UserId))
        {
            return null;
        }

        if (User.Identity?.IsAuthenticated != true)
        {
            return Unauthorized(new { message = "Authentication required for this build." });
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.Equals(userId, build.UserId, StringComparison.Ordinal))
        {
            return Forbid();
        }

        return null;
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
