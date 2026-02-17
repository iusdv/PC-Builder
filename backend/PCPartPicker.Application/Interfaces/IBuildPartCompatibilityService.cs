using PCPartPicker.Domain.Entities;
using PCPartPicker.Domain.Enums;
using PCPartPicker.Application.DTOs;

namespace PCPartPicker.Application.Interfaces;

public interface IBuildPartCompatibilityService
{
    (bool IsCompatible, List<IncompatibilityDetailDto> Details) Evaluate(Build build, Part candidate);
}
