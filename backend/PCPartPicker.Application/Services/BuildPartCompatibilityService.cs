using PCPartPicker.Application.Interfaces;
using PCPartPicker.Domain.Entities;
using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Application.Services;

public sealed class BuildPartCompatibilityService : IBuildPartCompatibilityService
{
    private readonly IWattageEstimator _wattageEstimator;

    public BuildPartCompatibilityService(IWattageEstimator wattageEstimator)
    {
        _wattageEstimator = wattageEstimator;
    }

    public (bool IsCompatible, List<string> Reasons) Evaluate(Build build, Part candidate)
    {
        var reasons = new List<string>();

        switch (candidate.Category)
        {
            case PartCategory.CPU:
                if (build.Motherboard != null && candidate is CPU cpu && cpu.Socket != build.Motherboard.Socket)
                {
                    reasons.Add("CPU socket does not match motherboard socket.");
                }
                break;

            case PartCategory.Cooler:
                // Cooler socket is not used for compatibility in this app.
                break;

            case PartCategory.Motherboard:
                if (candidate is Motherboard mb)
                {
                    if (build.CPU != null && build.CPU.Socket != mb.Socket)
                    {
                        reasons.Add("Motherboard socket does not match selected CPU.");
                    }

                    if (build.RAM != null && build.RAM.Type != mb.MemoryType)
                    {
                        reasons.Add("Motherboard memory type does not match selected RAM.");
                    }

                    if (build.Case != null)
                    {
                        var ok = IsFormFactorCompatible(build.Case.FormFactor, mb.FormFactor);
                        if (!ok)
                        {
                            reasons.Add("Motherboard form factor is not compatible with selected case.");
                        }
                    }
                }
                break;

            case PartCategory.RAM:
                if (candidate is RAM ram)
                {
                    if (build.Motherboard != null && ram.Type != build.Motherboard.MemoryType)
                    {
                        reasons.Add("RAM type does not match motherboard memory type.");
                    }

                    if (build.Motherboard != null && build.Motherboard.MaxMemoryGB > 0 && ram.CapacityGB > build.Motherboard.MaxMemoryGB)
                    {
                        reasons.Add("RAM capacity exceeds motherboard max supported memory.");
                    }
                }
                break;

            case PartCategory.GPU:
                if (candidate is GPU gpu)
                {
                    if (build.Case != null && gpu.Length > build.Case.MaxGPULength)
                    {
                        reasons.Add("GPU length exceeds case maximum GPU length.");
                    }
                }
                break;

            case PartCategory.PSU:
                if (candidate is PSU psu)
                {
                    var estimated = _wattageEstimator.EstimateTotalWattage(build);
                    if (psu.WattageRating < estimated)
                    {
                        reasons.Add("PSU wattage rating is below estimated system wattage.");
                    }
                }
                break;

            case PartCategory.Case:
                if (candidate is Case pcCase)
                {
                    if (build.Motherboard != null)
                    {
                        var ok = IsFormFactorCompatible(pcCase.FormFactor, build.Motherboard.FormFactor);
                        if (!ok)
                        {
                            reasons.Add("Case form factor does not support selected motherboard.");
                        }
                    }

                    if (build.GPU != null && build.GPU.Length > pcCase.MaxGPULength)
                    {
                        reasons.Add("Case max GPU length is too small for selected GPU.");
                    }
                }
                break;

            case PartCategory.Storage:
                break;

            default:
                break;
        }

        return (reasons.Count == 0, reasons);
    }

    private static bool IsFormFactorCompatible(FormFactor caseFormFactor, FormFactor motherboardFormFactor)
    {
        return caseFormFactor switch
        {
            FormFactor.EATX => true,
            FormFactor.ATX => motherboardFormFactor != FormFactor.EATX,
            FormFactor.MicroATX => motherboardFormFactor == FormFactor.MicroATX || motherboardFormFactor == FormFactor.MiniITX,
            FormFactor.MiniITX => motherboardFormFactor == FormFactor.MiniITX,
            _ => false
        };
    }
}
