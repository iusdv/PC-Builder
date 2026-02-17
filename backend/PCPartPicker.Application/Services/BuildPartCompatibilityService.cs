using PCPartPicker.Application.Interfaces;
using PCPartPicker.Application.DTOs;
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

    public (bool IsCompatible, List<IncompatibilityDetailDto> Details) Evaluate(Build build, Part candidate)
    {
        var details = new List<IncompatibilityDetailDto>();

        void Add(PartCategory? withCategory, Part? withPart, string reason)
        {
            details.Add(new IncompatibilityDetailDto
            {
                WithCategory = withCategory,
                WithPartId = withPart?.Id,
                WithPartName = withPart?.Name,
                Reason = reason
            });
        }

        switch (candidate.Category)
        {
            case PartCategory.CPU:
                if (build.Motherboard != null && candidate is CPU cpu && cpu.Socket != build.Motherboard.Socket)
                {
                    Add(
                        PartCategory.Motherboard,
                        build.Motherboard,
                        $"Socket mismatch ({cpu.Socket} vs {build.Motherboard.Socket}).");
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
                        Add(
                            PartCategory.CPU,
                            build.CPU,
                            $"Socket mismatch ({mb.Socket} vs {build.CPU.Socket}).");
                    }

                    if (build.RAM != null && build.RAM.Type != mb.MemoryType)
                    {
                        Add(
                            PartCategory.RAM,
                            build.RAM,
                            $"Memory type mismatch ({mb.MemoryType} vs {build.RAM.Type}).");
                    }

                    if (build.Case != null)
                    {
                        var ok = IsFormFactorCompatible(build.Case.FormFactor, mb.FormFactor);
                        if (!ok)
                        {
                            Add(
                                PartCategory.Case,
                                build.Case,
                                $"Form factor not supported ({mb.FormFactor} in {build.Case.FormFactor}).");
                        }
                    }
                }
                break;

            case PartCategory.RAM:
                if (candidate is RAM ram)
                {
                    if (build.Motherboard != null && ram.Type != build.Motherboard.MemoryType)
                    {
                        Add(
                            PartCategory.Motherboard,
                            build.Motherboard,
                            $"Memory type mismatch ({ram.Type} vs {build.Motherboard.MemoryType}).");
                    }

                    if (build.Motherboard != null && build.Motherboard.MaxMemoryGB > 0 && ram.CapacityGB > build.Motherboard.MaxMemoryGB)
                    {
                        Add(
                            PartCategory.Motherboard,
                            build.Motherboard,
                            $"Capacity too large ({ram.CapacityGB}GB > {build.Motherboard.MaxMemoryGB}GB)."
                        );
                    }
                }
                break;

            case PartCategory.GPU:
                if (candidate is GPU gpu)
                {
                    if (build.Case != null && gpu.Length > build.Case.MaxGPULength)
                    {
                        Add(
                            PartCategory.Case,
                            build.Case,
                            $"Too long ({gpu.Length}mm > {build.Case.MaxGPULength}mm)."
                        );
                    }
                }
                break;

            case PartCategory.PSU:
                if (candidate is PSU psu)
                {
                    var estimated = _wattageEstimator.EstimateTotalWattage(build);
                    if (psu.WattageRating < estimated)
                    {
                        // Not tied to a single part; point to the overall build.
                        Add(
                            null,
                            null,
                            $"Insufficient wattage ({psu.WattageRating}W < {estimated}W)."
                        );
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
                            Add(
                                PartCategory.Motherboard,
                                build.Motherboard,
                                $"Does not support form factor ({build.Motherboard.FormFactor} in {pcCase.FormFactor})."
                            );
                        }
                    }

                    if (build.GPU != null && build.GPU.Length > pcCase.MaxGPULength)
                    {
                        Add(
                            PartCategory.GPU,
                            build.GPU,
                            $"GPU clearance too small ({pcCase.MaxGPULength}mm < {build.GPU.Length}mm)."
                        );
                    }
                }
                break;

            case PartCategory.Storage:
                break;

            default:
                break;
        }

        return (details.Count == 0, details);
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
