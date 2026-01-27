using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PCPartPicker.Domain.Entities;
using PCPartPicker.Infrastructure.Data;

namespace PCPartPicker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PartsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PartsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("cpus")]
    public async Task<ActionResult<IEnumerable<CPU>>> GetCPUs()
    {
        return await _context.CPUs.ToListAsync();
    }

    [HttpGet("cpus/{id}")]
    public async Task<ActionResult<CPU>> GetCPU(int id)
    {
        var cpu = await _context.CPUs.FindAsync(id);
        if (cpu == null) return NotFound();
        return cpu;
    }

    [HttpPost("cpus")]
    public async Task<ActionResult<CPU>> CreateCPU(CPU cpu)
    {
        _context.CPUs.Add(cpu);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetCPU), new { id = cpu.Id }, cpu);
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
    public async Task<ActionResult<Motherboard>> CreateMotherboard(Motherboard motherboard)
    {
        _context.Motherboards.Add(motherboard);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetMotherboard), new { id = motherboard.Id }, motherboard);
    }

    [HttpGet("rams")]
    public async Task<ActionResult<IEnumerable<RAM>>> GetRAMs()
    {
        return await _context.RAMs.ToListAsync();
    }

    [HttpGet("gpus")]
    public async Task<ActionResult<IEnumerable<GPU>>> GetGPUs()
    {
        return await _context.GPUs.ToListAsync();
    }

    [HttpGet("storages")]
    public async Task<ActionResult<IEnumerable<Storage>>> GetStorages()
    {
        return await _context.Storages.ToListAsync();
    }

    [HttpGet("psus")]
    public async Task<ActionResult<IEnumerable<PSU>>> GetPSUs()
    {
        return await _context.PSUs.ToListAsync();
    }

    [HttpGet("cases")]
    public async Task<ActionResult<IEnumerable<Case>>> GetCases()
    {
        return await _context.Cases.ToListAsync();
    }
}
