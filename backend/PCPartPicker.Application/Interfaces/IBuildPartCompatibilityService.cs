using PCPartPicker.Domain.Entities;
using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Application.Interfaces;

public interface IBuildPartCompatibilityService
{
    (bool IsCompatible, List<string> Reasons) Evaluate(Build build, Part candidate);
}
