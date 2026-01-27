using PCPartPicker.Application.DTOs;
using PCPartPicker.Domain.Entities;

namespace PCPartPicker.Application.Interfaces;

public interface ICompatibilityService
{
    CompatibilityCheckResult CheckCompatibility(Build build);
}
