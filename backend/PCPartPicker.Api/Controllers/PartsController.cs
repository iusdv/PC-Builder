using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PCPartPicker.Application.DTOs;
using PCPartPicker.Application.Interfaces;
using PCPartPicker.Domain.Entities;
using PCPartPicker.Domain.Enums;
using PCPartPicker.Infrastructure.Data;

namespace PCPartPicker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PartsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IBuildPartCompatibilityService _buildPartCompatibilityService;

    public PartsController(ApplicationDbContext context, IBuildPartCompatibilityService buildPartCompatibilityService)
    {
        _context = context;
        _buildPartCompatibilityService = buildPartCompatibilityService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PartDto>>> GetAllParts(
        [FromQuery] string? search,
        [FromQuery] PartCategory? category,
        [FromQuery] string? manufacturer,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] string? sort,
        [FromQuery] bool includeNoImage = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        IQueryable<Part> query = _context.Set<Part>().AsNoTracking();

        if (!includeNoImage)
        {
            query = query.Where(p => !string.IsNullOrWhiteSpace(p.ImageUrl));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(p => p.Name.Contains(term) || p.Manufacturer.Contains(term));
        }

        if (category.HasValue)
        {
            query = query.Where(p => p.Category == category.Value);
        }

        if (category == PartCategory.Case)
        {
            query = query.Where(p =>
                !EF.Functions.Like(p.Name, "%case fan%") &&
                !EF.Functions.Like(p.ProductUrl ?? string.Empty, "%case-fan%"));
        }

        if (!string.IsNullOrWhiteSpace(manufacturer))
        {
            var m = manufacturer.Trim().ToLower();
            query = query.Where(p => p.Manufacturer.ToLower().Contains(m));
        }

        if (minPrice.HasValue)
        {
            query = query.Where(p => p.Price >= minPrice.Value);
        }

        if (maxPrice.HasValue)
        {
            query = query.Where(p => p.Price <= maxPrice.Value);
        }

        query = (sort ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "price" => query.OrderBy(p => p.Price).ThenBy(p => p.Name),
            "-price" => query.OrderByDescending(p => p.Price).ThenBy(p => p.Name),
            "name" => query.OrderBy(p => p.Name),
            "-name" => query.OrderByDescending(p => p.Name),
            _ => query.OrderBy(p => p.Category).ThenBy(p => p.Name)
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new PartDto
            {
                Id = p.Id,
                Name = p.Name,
                Manufacturer = p.Manufacturer,
                Price = p.Price,
                ImageUrl = p.ImageUrl,
                Category = p.Category,
                Wattage = p.Wattage,
                ProductUrl = p.ProductUrl,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PartDto>> GetPart(int id)
    {
        var part = await _context.Set<Part>().AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        if (part == null) return NotFound();

        return Ok(new PartDto
        {
            Id = part.Id,
            Name = part.Name,
            Manufacturer = part.Manufacturer,
            Price = part.Price,
            ImageUrl = part.ImageUrl,
            Category = part.Category,
            Wattage = part.Wattage,
            ProductUrl = part.ProductUrl,
        });
    }

    [HttpGet("select")]
    public async Task<ActionResult<PagedResultDto<PartSelectionItemDto>>> GetSelectableParts(
        [FromQuery] PartCategory category,
        [FromQuery] int? buildId,
        [FromQuery] bool compatibleOnly = false,
        [FromQuery] string? search = null,
        [FromQuery] string? manufacturer = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] string? sort = null,
        [FromQuery] bool includeNoImage = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        Build? build = null;
        if (buildId.HasValue)
        {
            build = await GetBuildWithParts(buildId.Value);

            if (build == null)
            {
                return NotFound(new { message = "Build not found." });
            }
        }

        var term = (search ?? string.Empty).Trim();
        var brand = (manufacturer ?? string.Empty).Trim();

        IQueryable<Part> query = category switch
        {
            PartCategory.CPU => _context.CPUs.AsNoTracking().Cast<Part>(),
            PartCategory.Cooler => _context.Coolers.AsNoTracking().Cast<Part>(),
            PartCategory.Motherboard => _context.Motherboards.AsNoTracking().Cast<Part>(),
            PartCategory.RAM => _context.RAMs.AsNoTracking().Cast<Part>(),
            PartCategory.GPU => _context.GPUs.AsNoTracking().Cast<Part>(),
            PartCategory.Storage => _context.Storages.AsNoTracking().Cast<Part>(),
            PartCategory.PSU => _context.PSUs.AsNoTracking().Cast<Part>(),
            PartCategory.Case => _context.Cases.AsNoTracking().Cast<Part>(),
            PartCategory.CaseFan => _context.CaseFans.AsNoTracking().Cast<Part>(),
            _ => throw new InvalidOperationException("Unsupported category")
        };

        if (category == PartCategory.Case)
        {
            query = query.Where(p =>
                !EF.Functions.Like(p.Name, "%case fan%") &&
                !EF.Functions.Like(p.ProductUrl ?? string.Empty, "%case-fan%"));
        }

        if (!includeNoImage)
        {
            query = query.Where(p => p.ImageUrl != null && p.ImageUrl != "");
        }

        if (!string.IsNullOrWhiteSpace(term))
        {
            query = query.Where(p => p.Name.Contains(term) || p.Manufacturer.Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(brand))
        {
            query = query.Where(p => EF.Functions.Like(p.Manufacturer, $"%{brand}%"));
        }

        if (minPrice.HasValue)
        {
            query = query.Where(p => p.Price >= minPrice.Value);
        }

        if (maxPrice.HasValue)
        {
            query = query.Where(p => p.Price <= maxPrice.Value);
        }

        query = (sort ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "price" => query.OrderBy(p => p.Price).ThenBy(p => p.Name),
            "-price" => query.OrderByDescending(p => p.Price).ThenBy(p => p.Name),
            "name" => query.OrderBy(p => p.Name),
            "-name" => query.OrderByDescending(p => p.Name),
            _ => query.OrderBy(p => p.Name)
        };

        if (build != null && compatibleOnly)
        {
            // Apply compatibility filtering before paging.
            var allCandidates = await query.ToListAsync();
            var compatibleItems = new List<PartSelectionItemDto>(allCandidates.Count);

            foreach (var candidate in allCandidates)
            {
                var (isCompatible, details) = _buildPartCompatibilityService.Evaluate(build, candidate);
                if (!isCompatible)
                {
                    continue;
                }

                compatibleItems.Add(new PartSelectionItemDto
                {
                    Id = candidate.Id,
                    Name = candidate.Name,
                    Manufacturer = candidate.Manufacturer,
                    Price = candidate.Price,
                    ImageUrl = candidate.ImageUrl,
                    Category = candidate.Category,
                    Specs = BuildSpecs(candidate),
                    IsCompatible = true,
                    IncompatibilityReasons = details.Select(d => d.Reason).ToList(),
                    IncompatibilityDetails = details,
                });
            }

            var totalCompatible = compatibleItems.Count;
            var pagedCompatible = compatibleItems
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new PagedResultDto<PartSelectionItemDto>
            {
                Items = pagedCompatible,
                TotalCount = totalCompatible,
                Page = page,
                PageSize = pageSize,
            });
        }

        var totalCount = await query.CountAsync();

        var candidates = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = new List<PartSelectionItemDto>(candidates.Count);
        foreach (var candidate in candidates)
        {
            var (isCompatible, details) = build == null
                ? (true, new List<PCPartPicker.Application.DTOs.IncompatibilityDetailDto>())
                : _buildPartCompatibilityService.Evaluate(build, candidate);

            items.Add(new PartSelectionItemDto
            {
                Id = candidate.Id,
                Name = candidate.Name,
                Manufacturer = candidate.Manufacturer,
                Price = candidate.Price,
                ImageUrl = candidate.ImageUrl,
                Category = candidate.Category,
                Specs = BuildSpecs(candidate),
                IsCompatible = isCompatible,
                IncompatibilityReasons = details.Select(d => d.Reason).ToList(),
                IncompatibilityDetails = details,
            });
        }

        return Ok(new PagedResultDto<PartSelectionItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        });
    }

    private async Task<Build?> GetBuildWithParts(int buildId)
    {
        var build = await _context.Builds.AsNoTracking().FirstOrDefaultAsync(b => b.Id == buildId);
        if (build == null) return null;

        var ids = new List<int>(capacity: 9);
        void Add(int? id)
        {
            if (id.HasValue) ids.Add(id.Value);
        }

        Add(build.CPUId);
        Add(build.CoolerId);
        Add(build.MotherboardId);
        Add(build.RAMId);
        Add(build.GPUId);
        Add(build.StorageId);
        Add(build.PSUId);
        Add(build.CaseId);
        Add(build.CaseFanId);

        if (ids.Count == 0) return build;

        var parts = await _context.Set<Part>()
            .AsNoTracking()
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
        build.CaseFan = build.CaseFanId.HasValue && byId.TryGetValue(build.CaseFanId.Value, out var caseFan) ? caseFan as CaseFan : null;

        return build;
    }

    [HttpGet("select/meta")]
    public async Task<ActionResult<PartSelectMetaDto>> GetSelectablePartsMeta(
        [FromQuery] PartCategory category,
        [FromQuery] string? search = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] bool includeNoImage = false)
    {
        var term = (search ?? string.Empty).Trim();

        IQueryable<Part> query = category switch
        {
            PartCategory.CPU => _context.CPUs.AsNoTracking().Cast<Part>(),
            PartCategory.Cooler => _context.Coolers.AsNoTracking().Cast<Part>(),
            PartCategory.Motherboard => _context.Motherboards.AsNoTracking().Cast<Part>(),
            PartCategory.RAM => _context.RAMs.AsNoTracking().Cast<Part>(),
            PartCategory.GPU => _context.GPUs.AsNoTracking().Cast<Part>(),
            PartCategory.Storage => _context.Storages.AsNoTracking().Cast<Part>(),
            PartCategory.PSU => _context.PSUs.AsNoTracking().Cast<Part>(),
            PartCategory.Case => _context.Cases.AsNoTracking().Cast<Part>(),
            PartCategory.CaseFan => _context.CaseFans.AsNoTracking().Cast<Part>(),
            _ => throw new InvalidOperationException("Unsupported category")
        };

        if (!includeNoImage)
        {
            query = query.Where(p => !string.IsNullOrWhiteSpace(p.ImageUrl));
        }

        if (!string.IsNullOrWhiteSpace(term))
        {
            query = query.Where(p => p.Name.Contains(term) || p.Manufacturer.Contains(term));
        }

        if (minPrice.HasValue)
        {
            query = query.Where(p => p.Price >= minPrice.Value);
        }

        if (maxPrice.HasValue)
        {
            query = query.Where(p => p.Price <= maxPrice.Value);
        }

        var manufacturers = await query
            .Select(p => p.Manufacturer)
            .Where(m => !string.IsNullOrWhiteSpace(m))
            .Distinct()
            .OrderBy(m => m)
            .ToListAsync();

        return Ok(new PartSelectMetaDto
        {
            Manufacturers = manufacturers,
        });
    }

    [HttpGet("cpus")]
    public async Task<ActionResult<IEnumerable<CPU>>> GetCPUs()
    {
        return await _context.CPUs.ToListAsync();
    }

    [HttpGet("coolers")]
    public async Task<ActionResult<IEnumerable<Cooler>>> GetCoolers()
    {
        return await _context.Coolers.ToListAsync();
    }

    [HttpGet("coolers/{id:int}")]
    public async Task<ActionResult<Cooler>> GetCooler(int id)
    {
        var cooler = await _context.Coolers.FindAsync(id);
        if (cooler == null) return NotFound();
        return cooler;
    }

    [HttpPost("coolers")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<Cooler>> CreateCooler(Cooler cooler)
    {
        if (string.IsNullOrWhiteSpace(cooler.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        cooler.Socket = SocketType.Unknown;

        _context.Coolers.Add(cooler);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetCooler), new { id = cooler.Id }, cooler);
    }

    [HttpPut("coolers/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateCooler(int id, Cooler cooler)
    {
        if (string.IsNullOrWhiteSpace(cooler.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        var existing = await _context.Coolers.FindAsync(id);
        if (existing == null) return NotFound();

        MapPartCommon(existing, cooler);
        existing.Socket = SocketType.Unknown;
        existing.CoolerType = cooler.CoolerType;
        existing.HeightMM = cooler.HeightMM;
        existing.RadiatorSizeMM = cooler.RadiatorSizeMM;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("coolers/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteCooler(int id)
    {
        var existing = await _context.Coolers.FindAsync(id);
        if (existing == null) return NotFound();

        _context.Coolers.Remove(existing);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Unable to delete cooler. It may be referenced by a build." });
        }

        return NoContent();
    }

    [HttpGet("cpus/{id}")]
    public async Task<ActionResult<CPU>> GetCPU(int id)
    {
        var cpu = await _context.CPUs.FindAsync(id);
        if (cpu == null) return NotFound();
        return cpu;
    }

    [HttpPost("cpus")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<CPU>> CreateCPU(CPU cpu)
    {
        if (string.IsNullOrWhiteSpace(cpu.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        _context.CPUs.Add(cpu);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetCPU), new { id = cpu.Id }, cpu);
    }

    [HttpPut("cpus/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateCPU(int id, CPU cpu)
    {
        if (string.IsNullOrWhiteSpace(cpu.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        var existing = await _context.CPUs.FindAsync(id);
        if (existing == null) return NotFound();

        MapPartCommon(existing, cpu);
        existing.Socket = cpu.Socket;
        existing.CoreCount = cpu.CoreCount;
        existing.ThreadCount = cpu.ThreadCount;
        existing.BaseClock = cpu.BaseClock;
        existing.BoostClock = cpu.BoostClock;
        existing.IntegratedGraphics = cpu.IntegratedGraphics;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("cpus/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteCPU(int id)
    {
        var existing = await _context.CPUs.FindAsync(id);
        if (existing == null) return NotFound();

        _context.CPUs.Remove(existing);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Unable to delete CPU. It may be referenced by a build." });
        }

        return NoContent();
    }

    [HttpGet("motherboards")]
    public async Task<ActionResult<IEnumerable<Motherboard>>> GetMotherboards()
    {
        return await _context.Motherboards.ToListAsync();
    }

    [HttpGet("motherboards/{id}")]
    public async Task<ActionResult<Motherboard>> GetMotherboard(int id)
    {
        var motherboard = await _context.Motherboards.FindAsync(id);
        if (motherboard == null) return NotFound();
        return motherboard;
    }

    [HttpPost("motherboards")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<Motherboard>> CreateMotherboard(Motherboard motherboard)
    {
        if (string.IsNullOrWhiteSpace(motherboard.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        _context.Motherboards.Add(motherboard);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetMotherboard), new { id = motherboard.Id }, motherboard);
    }

    [HttpPut("motherboards/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateMotherboard(int id, Motherboard motherboard)
    {
        if (string.IsNullOrWhiteSpace(motherboard.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        var existing = await _context.Motherboards.FindAsync(id);
        if (existing == null) return NotFound();

        MapPartCommon(existing, motherboard);
        existing.Socket = motherboard.Socket;
        existing.Chipset = motherboard.Chipset;
        existing.FormFactor = motherboard.FormFactor;
        existing.MemoryType = motherboard.MemoryType;
        existing.MemorySlots = motherboard.MemorySlots;
        existing.MaxMemoryGB = motherboard.MaxMemoryGB;
        existing.PCIeSlots = motherboard.PCIeSlots;
        existing.M2Slots = motherboard.M2Slots;
        existing.SataSlots = motherboard.SataSlots;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("motherboards/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteMotherboard(int id)
    {
        var existing = await _context.Motherboards.FindAsync(id);
        if (existing == null) return NotFound();

        _context.Motherboards.Remove(existing);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Unable to delete motherboard. It may be referenced by a build." });
        }

        return NoContent();
    }

    [HttpGet("rams")]
    public async Task<ActionResult<IEnumerable<RAM>>> GetRAMs()
    {
        return await _context.RAMs.ToListAsync();
    }

    [HttpGet("rams/{id:int}")]
    public async Task<ActionResult<RAM>> GetRAM(int id)
    {
        var ram = await _context.RAMs.FindAsync(id);
        if (ram == null) return NotFound();
        return ram;
    }

    [HttpPost("rams")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<RAM>> CreateRAM(RAM ram)
    {
        if (string.IsNullOrWhiteSpace(ram.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        _context.RAMs.Add(ram);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetRAM), new { id = ram.Id }, ram);
    }

    [HttpPut("rams/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateRAM(int id, RAM ram)
    {
        if (string.IsNullOrWhiteSpace(ram.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        var existing = await _context.RAMs.FindAsync(id);
        if (existing == null) return NotFound();

        MapPartCommon(existing, ram);
        existing.Type = ram.Type;
        existing.SpeedMHz = ram.SpeedMHz;
        existing.CapacityGB = ram.CapacityGB;
        existing.ModuleCount = ram.ModuleCount;
        existing.CASLatency = ram.CASLatency;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("rams/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteRAM(int id)
    {
        var existing = await _context.RAMs.FindAsync(id);
        if (existing == null) return NotFound();

        _context.RAMs.Remove(existing);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Unable to delete RAM. It may be referenced by a build." });
        }

        return NoContent();
    }

    [HttpGet("gpus")]
    public async Task<ActionResult<IEnumerable<GPU>>> GetGPUs()
    {
        return await _context.GPUs.ToListAsync();
    }

    [HttpGet("gpus/{id:int}")]
    public async Task<ActionResult<GPU>> GetGPU(int id)
    {
        var gpu = await _context.GPUs.FindAsync(id);
        if (gpu == null) return NotFound();
        return gpu;
    }

    [HttpPost("gpus")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<GPU>> CreateGPU(GPU gpu)
    {
        if (string.IsNullOrWhiteSpace(gpu.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        _context.GPUs.Add(gpu);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetGPU), new { id = gpu.Id }, gpu);
    }

    [HttpPut("gpus/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateGPU(int id, GPU gpu)
    {
        if (string.IsNullOrWhiteSpace(gpu.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        var existing = await _context.GPUs.FindAsync(id);
        if (existing == null) return NotFound();

        MapPartCommon(existing, gpu);
        existing.Chipset = gpu.Chipset;
        existing.MemoryGB = gpu.MemoryGB;
        existing.MemoryType = gpu.MemoryType;
        existing.CoreClock = gpu.CoreClock;
        existing.BoostClock = gpu.BoostClock;
        existing.Length = gpu.Length;
        existing.GpuHeightMM = gpu.GpuHeightMM;
        existing.Slots = gpu.Slots;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("gpus/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteGPU(int id)
    {
        var existing = await _context.GPUs.FindAsync(id);
        if (existing == null) return NotFound();

        _context.GPUs.Remove(existing);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Unable to delete GPU. It may be referenced by a build." });
        }

        return NoContent();
    }

    [HttpGet("storages")]
    public async Task<ActionResult<IEnumerable<Storage>>> GetStorages()
    {
        return await _context.Storages.ToListAsync();
    }

    [HttpGet("storages/{id:int}")]
    public async Task<ActionResult<Storage>> GetStorage(int id)
    {
        var storage = await _context.Storages.FindAsync(id);
        if (storage == null) return NotFound();
        return storage;
    }

    [HttpPost("storages")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<Storage>> CreateStorage(Storage storage)
    {
        if (string.IsNullOrWhiteSpace(storage.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        _context.Storages.Add(storage);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetStorage), new { id = storage.Id }, storage);
    }

    [HttpPut("storages/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateStorage(int id, Storage storage)
    {
        if (string.IsNullOrWhiteSpace(storage.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        var existing = await _context.Storages.FindAsync(id);
        if (existing == null) return NotFound();

        MapPartCommon(existing, storage);
        existing.Type = storage.Type;
        existing.CapacityGB = storage.CapacityGB;
        existing.Interface = storage.Interface;
        existing.ReadSpeedMBps = storage.ReadSpeedMBps;
        existing.WriteSpeedMBps = storage.WriteSpeedMBps;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("storages/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteStorage(int id)
    {
        var existing = await _context.Storages.FindAsync(id);
        if (existing == null) return NotFound();

        _context.Storages.Remove(existing);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Unable to delete storage. It may be referenced by a build." });
        }

        return NoContent();
    }

    [HttpGet("psus")]
    public async Task<ActionResult<IEnumerable<PSU>>> GetPSUs()
    {
        return await _context.PSUs.ToListAsync();
    }

    [HttpGet("psus/{id:int}")]
    public async Task<ActionResult<PSU>> GetPSU(int id)
    {
        var psu = await _context.PSUs.FindAsync(id);
        if (psu == null) return NotFound();
        return psu;
    }

    [HttpPost("psus")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<PSU>> CreatePSU(PSU psu)
    {
        if (string.IsNullOrWhiteSpace(psu.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        _context.PSUs.Add(psu);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPSU), new { id = psu.Id }, psu);
    }

    [HttpPut("psus/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdatePSU(int id, PSU psu)
    {
        if (string.IsNullOrWhiteSpace(psu.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        var existing = await _context.PSUs.FindAsync(id);
        if (existing == null) return NotFound();

        MapPartCommon(existing, psu);
        existing.WattageRating = psu.WattageRating;
        existing.Efficiency = psu.Efficiency;
        existing.Modular = psu.Modular;
        existing.FormFactor = psu.FormFactor;
        existing.PsuLengthMM = psu.PsuLengthMM;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("psus/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeletePSU(int id)
    {
        var existing = await _context.PSUs.FindAsync(id);
        if (existing == null) return NotFound();

        _context.PSUs.Remove(existing);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Unable to delete PSU. It may be referenced by a build." });
        }

        return NoContent();
    }

    [HttpGet("cases")]
    public async Task<ActionResult<IEnumerable<Case>>> GetCases()
    {
        return await _context.Cases.ToListAsync();
    }

    [HttpDelete("cases/misclassified-case-fans")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<object>> DeleteMisclassifiedCaseFansFromCases()
    {
        // These were accidentally imported as Cases due to Alternate search noise.
        var candidates = await _context.Cases
            .Where(c =>
                EF.Functions.Like(c.Name, "%case fan%") ||
                EF.Functions.Like(c.Name, "%behuizing ventilator%") ||
                EF.Functions.Like(c.Name, "%ventilator%") ||
                EF.Functions.Like(c.ProductUrl ?? string.Empty, "%case-fan%"))
            .Select(c => c.Id)
            .ToListAsync();

        if (candidates.Count == 0)
        {
            return Ok(new { matched = 0, deleted = 0, skippedReferencedByBuild = 0 });
        }

        var referenced = new HashSet<int>(await _context.Builds
            .Where(b => b.CaseId.HasValue && candidates.Contains(b.CaseId.Value))
            .Select(b => b.CaseId!.Value)
            .Distinct()
            .ToListAsync());

        var deletableIds = candidates.Where(id => !referenced.Contains(id)).ToList();

        if (deletableIds.Count > 0)
        {
            var toDelete = await _context.Cases.Where(c => deletableIds.Contains(c.Id)).ToListAsync();
            _context.Cases.RemoveRange(toDelete);
            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            matched = candidates.Count,
            deleted = deletableIds.Count,
            skippedReferencedByBuild = referenced.Count,
        });
    }

    [HttpGet("cases/{id:int}")]
    public async Task<ActionResult<Case>> GetCase(int id)
    {
        var pcCase = await _context.Cases.FindAsync(id);
        if (pcCase == null) return NotFound();
        return pcCase;
    }

    [HttpPost("cases")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<Case>> CreateCase(Case pcCase)
    {
        if (string.IsNullOrWhiteSpace(pcCase.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        _context.Cases.Add(pcCase);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetCase), new { id = pcCase.Id }, pcCase);
    }

    [HttpPut("cases/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateCase(int id, Case pcCase)
    {
        if (string.IsNullOrWhiteSpace(pcCase.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        var existing = await _context.Cases.FindAsync(id);
        if (existing == null) return NotFound();

        MapPartCommon(existing, pcCase);
        existing.FormFactor = pcCase.FormFactor;
        existing.MaxGPULength = pcCase.MaxGPULength;
        existing.MaxCoolerHeightMM = pcCase.MaxCoolerHeightMM;
        existing.Color = pcCase.Color;
        existing.HasSidePanel = pcCase.HasSidePanel;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("cases/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteCase(int id)
    {
        var existing = await _context.Cases.FindAsync(id);
        if (existing == null) return NotFound();

        _context.Cases.Remove(existing);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Unable to delete case. It may be referenced by a build." });
        }

        return NoContent();
    }

    [HttpGet("casefans")]
    public async Task<ActionResult<IEnumerable<CaseFan>>> GetCaseFans()
    {
        return await _context.CaseFans.ToListAsync();
    }

    [HttpGet("casefans/{id:int}")]
    public async Task<ActionResult<CaseFan>> GetCaseFan(int id)
    {
        var fan = await _context.CaseFans.FindAsync(id);
        if (fan == null) return NotFound();
        return fan;
    }

    [HttpPost("casefans")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<CaseFan>> CreateCaseFan(CaseFan fan)
    {
        if (string.IsNullOrWhiteSpace(fan.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        _context.CaseFans.Add(fan);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetCaseFan), new { id = fan.Id }, fan);
    }

    [HttpPut("casefans/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateCaseFan(int id, CaseFan fan)
    {
        if (string.IsNullOrWhiteSpace(fan.ImageUrl))
        {
            return BadRequest(new { message = "ImageUrl is required." });
        }

        var existing = await _context.CaseFans.FindAsync(id);
        if (existing == null) return NotFound();

        MapPartCommon(existing, fan);

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("casefans/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteCaseFan(int id)
    {
        var existing = await _context.CaseFans.FindAsync(id);
        if (existing == null) return NotFound();

        _context.CaseFans.Remove(existing);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static void MapPartCommon(Part target, Part source)
    {
        target.Name = source.Name;
        target.Manufacturer = source.Manufacturer;
        target.Price = source.Price;
        target.ImageUrl = source.ImageUrl;
        target.Wattage = source.Wattage;
        target.ProductUrl = source.ProductUrl;
    }

    private static Dictionary<string, string> BuildSpecs(Part part)
    {
        var specs = part switch
        {
            CPU cpu => new Dictionary<string, string>
            {
                ["cores"] = cpu.CoreCount.ToString(),
                ["threads"] = cpu.ThreadCount.ToString(),
                ["speed"] = $"{cpu.BaseClock:0.##} GHz",
                ["boost"] = $"{cpu.BoostClock:0.##} GHz",
                ["socket"] = cpu.Socket.ToString(),
                ["igpu"] = cpu.IntegratedGraphics ? "Yes" : "No",
            },
            Cooler cooler => new Dictionary<string, string>
            {
                ["type"] = string.IsNullOrWhiteSpace(cooler.CoolerType) ? "Cooler" : cooler.CoolerType,
                ["height"] = cooler.HeightMM > 0 ? $"{cooler.HeightMM} mm" : "-",
                ["radiator"] = cooler.RadiatorSizeMM.HasValue ? $"{cooler.RadiatorSizeMM.Value} mm" : "-",
            },
            Motherboard mb => new Dictionary<string, string>
            {
                ["socket"] = mb.Socket.ToString(),
                ["chipset"] = mb.Chipset,
                ["form"] = mb.FormFactor.ToString(),
                ["memory"] = mb.MemoryType.ToString(),
                ["memorySlots"] = mb.MemorySlots.ToString(),
                ["maxMemory"] = $"{mb.MaxMemoryGB} GB",
                ["pcieSlots"] = mb.PCIeSlots.ToString(),
                ["m2Slots"] = mb.M2Slots.ToString(),
                ["sataSlots"] = mb.SataSlots.ToString(),
            },
            RAM ram => new Dictionary<string, string>
            {
                ["type"] = ram.Type.ToString(),
                ["speed"] = $"{ram.SpeedMHz} MHz",
                ["capacity"] = $"{ram.CapacityGB} GB",
                ["moduleCount"] = ram.ModuleCount.ToString(),
                ["latency"] = $"CL{ram.CASLatency}",
            },
            GPU gpu => new Dictionary<string, string>
            {
                ["chipset"] = gpu.Chipset,
                ["memory"] = $"{gpu.MemoryGB} GB",
                ["memoryType"] = gpu.MemoryType,
                ["core"] = $"{gpu.CoreClock} MHz",
                ["boost"] = $"{gpu.BoostClock} MHz",
                ["length"] = $"{gpu.Length} mm",
                ["slots"] = gpu.Slots.ToString(),
            },
            Storage storage => new Dictionary<string, string>
            {
                ["type"] = storage.Type,
                ["capacity"] = $"{storage.CapacityGB} GB",
                ["interface"] = storage.Interface,
                ["read"] = storage.ReadSpeedMBps.HasValue ? $"{storage.ReadSpeedMBps.Value} MB/s" : "-",
                ["write"] = storage.WriteSpeedMBps.HasValue ? $"{storage.WriteSpeedMBps.Value} MB/s" : "-",
            },
            PSU psu => new Dictionary<string, string>
            {
                ["rating"] = $"{psu.WattageRating} W",
                ["efficiency"] = psu.Efficiency,
                ["modular"] = psu.Modular ? "Yes" : "No",
                ["form"] = psu.FormFactor.ToString(),
            },
            Case pcCase => new Dictionary<string, string>
            {
                ["form"] = pcCase.FormFactor.ToString(),
                ["maxGpu"] = $"{pcCase.MaxGPULength} mm",
                ["maxCooler"] = pcCase.MaxCoolerHeightMM.HasValue ? $"{pcCase.MaxCoolerHeightMM.Value} mm" : "-",
                ["color"] = pcCase.Color,
            },
            CaseFan => new Dictionary<string, string>(),
            _ => new Dictionary<string, string>()
        };

        if (part.Wattage is int wattage && wattage > 0)
        {
            specs["wattage"] = $"{wattage} W";
        }

        return specs;
    }
}
