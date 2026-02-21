using PCPartPicker.Application.DTOs;
using PCPartPicker.Domain.Entities;

namespace PCPartPicker.Application.Interfaces;

public interface IUpgradePathService
{
    Task<UpgradePathResponseDto> GenerateUpgradePaths(Build build, UpgradePathRequestDto request);
}
