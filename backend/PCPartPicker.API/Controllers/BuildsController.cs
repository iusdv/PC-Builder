using Microsoft.AspNetCore.Mvc;
using PCPartPicker.Application.DTOs;
using PCPartPicker.Application.Interfaces;
using System.Security.Claims;

namespace PCPartPicker.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BuildsController : ControllerBase
{
    private readonly IBuildService _buildService;

    public BuildsController(IBuildService buildService)
    {
        _buildService = buildService;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(userIdClaim, out var userId) ? userId : 0;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BuildDto>>> GetUserBuilds()
    {
        var userId = GetUserId();
        if (userId == 0)
            return Unauthorized();

        var builds = await _buildService.GetUserBuildsAsync(userId);
        return Ok(builds);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BuildDto>> GetBuildById(int id)
    {
        var userId = GetUserId();
        if (userId == 0)
            return Unauthorized();

        var build = await _buildService.GetBuildByIdAsync(id, userId);
        if (build == null)
            return NotFound();

        return Ok(build);
    }

    [HttpGet("shared/{shareToken}")]
    public async Task<ActionResult<BuildDto>> GetBuildByShareToken(string shareToken)
    {
        var build = await _buildService.GetBuildByShareTokenAsync(shareToken);
        if (build == null)
            return NotFound();

        return Ok(build);
    }

    [HttpPost]
    public async Task<ActionResult<BuildDto>> CreateBuild([FromBody] CreateBuildDto createBuildDto)
    {
        var userId = GetUserId();
        if (userId == 0)
            return Unauthorized();

        var build = await _buildService.CreateBuildAsync(userId, createBuildDto);
        return CreatedAtAction(nameof(GetBuildById), new { id = build.Id }, build);
    }

    [HttpPost("{id}/parts")]
    public async Task<ActionResult<BuildDto>> AddPartToBuild(int id, [FromBody] AddPartToBuildDto addPartDto)
    {
        var userId = GetUserId();
        if (userId == 0)
            return Unauthorized();

        var build = await _buildService.AddPartToBuildAsync(id, userId, addPartDto);
        if (build == null)
            return NotFound();

        return Ok(build);
    }

    [HttpDelete("{id}/parts/{partId}")]
    public async Task<ActionResult> RemovePartFromBuild(int id, int partId)
    {
        var userId = GetUserId();
        if (userId == 0)
            return Unauthorized();

        var result = await _buildService.RemovePartFromBuildAsync(id, userId, partId);
        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteBuild(int id)
    {
        var userId = GetUserId();
        if (userId == 0)
            return Unauthorized();

        var result = await _buildService.DeleteBuildAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpGet("{id}/compatibility")]
    public async Task<ActionResult<IEnumerable<CompatibilityWarning>>> CheckCompatibility(int id)
    {
        var warnings = await _buildService.CheckCompatibilityAsync(id);
        return Ok(warnings);
    }
}
