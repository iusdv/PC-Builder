using PCPartPicker.Application.DTOs;

namespace PCPartPicker.Application.Interfaces;

public interface IBuildService
{
    Task<IEnumerable<BuildDto>> GetUserBuildsAsync(int userId);
    Task<BuildDto?> GetBuildByIdAsync(int buildId, int userId);
    Task<BuildDto?> GetBuildByShareTokenAsync(string shareToken);
    Task<BuildDto> CreateBuildAsync(int userId, CreateBuildDto createBuildDto);
    Task<BuildDto?> AddPartToBuildAsync(int buildId, int userId, AddPartToBuildDto addPartDto);
    Task<bool> RemovePartFromBuildAsync(int buildId, int userId, int partId);
    Task<bool> DeleteBuildAsync(int buildId, int userId);
    Task<IEnumerable<CompatibilityWarning>> CheckCompatibilityAsync(int buildId);
}
