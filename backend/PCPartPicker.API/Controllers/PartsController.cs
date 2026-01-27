using Microsoft.AspNetCore.Mvc;
using PCPartPicker.Application.DTOs;
using PCPartPicker.Application.Interfaces;

namespace PCPartPicker.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PartsController : ControllerBase
{
    private readonly IPCPartService _partService;

    public PartsController(IPCPartService partService)
    {
        _partService = partService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PCPartDto>>> GetAllParts()
    {
        var parts = await _partService.GetAllPartsAsync();
        return Ok(parts);
    }

    [HttpGet("category/{category}")]
    public async Task<ActionResult<IEnumerable<PCPartDto>>> GetPartsByCategory(string category)
    {
        var parts = await _partService.GetPartsByCategoryAsync(category);
        return Ok(parts);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PCPartDto>> GetPartById(int id)
    {
        var part = await _partService.GetPartByIdAsync(id);
        if (part == null)
            return NotFound();

        return Ok(part);
    }

    [HttpPost]
    public async Task<ActionResult<PCPartDto>> CreatePart([FromBody] CreatePCPartDto createPartDto)
    {
        var part = await _partService.CreatePartAsync(createPartDto);
        return CreatedAtAction(nameof(GetPartById), new { id = part.Id }, part);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PCPartDto>> UpdatePart(int id, [FromBody] UpdatePCPartDto updatePartDto)
    {
        var part = await _partService.UpdatePartAsync(id, updatePartDto);
        if (part == null)
            return NotFound();

        return Ok(part);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeletePart(int id)
    {
        var result = await _partService.DeletePartAsync(id);
        if (!result)
            return NotFound();

        return NoContent();
    }
}
