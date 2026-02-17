using PCPartPicker.Application.DTOs;
using PCPartPicker.Application.Interfaces;
using PCPartPicker.Domain.Entities;
using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Application.Services;

public class CompatibilityService : ICompatibilityService
{
    public CompatibilityCheckResult CheckCompatibility(Build build)
    {
        var result = new CompatibilityCheckResult
        {
            IsCompatible = true
        };

        void AddIssue(string severity, Part? part, PartCategory partCategory, Part? withPart, PartCategory? withCategory, string reason)
        {
            result.Issues.Add(new CompatibilityIssueDto
            {
                Severity = severity,
                PartCategory = partCategory,
                PartId = part?.Id,
                PartName = part?.Name,
                WithCategory = withCategory,
                WithPartId = withPart?.Id,
                WithPartName = withPart?.Name,
                Reason = reason,
            });
        }

        // Check CPU and Motherboard socket compatibility
        if (build.CPU != null && build.Motherboard != null)
        {
            if (build.CPU.Socket != build.Motherboard.Socket)
            {
                result.IsCompatible = false;
                var reason = $"Socket mismatch ({build.CPU.Socket} vs {build.Motherboard.Socket}).";
                result.Errors.Add(reason);
                AddIssue("Error", build.CPU, PartCategory.CPU, build.Motherboard, PartCategory.Motherboard, reason);
            }
        }

        // Check CPU and Cooler socket compatibility
        if (build.CPU != null && build.Cooler != null)
        {
            if (build.Cooler.Socket != SocketType.Unknown && build.CPU.Socket != build.Cooler.Socket)
            {
                result.IsCompatible = false;
                var reason = $"Socket mismatch ({build.CPU.Socket} vs {build.Cooler.Socket}).";
                result.Errors.Add(reason);
                AddIssue("Error", build.Cooler, PartCategory.Cooler, build.CPU, PartCategory.CPU, reason);
            }
        }

        // Check RAM type compatibility
        if (build.RAM != null && build.Motherboard != null)
        {
            if (build.RAM.Type != build.Motherboard.MemoryType)
            {
                result.IsCompatible = false;
                var reason = $"Memory type mismatch ({build.RAM.Type} vs {build.Motherboard.MemoryType}).";
                result.Errors.Add(reason);
                AddIssue("Error", build.RAM, PartCategory.RAM, build.Motherboard, PartCategory.Motherboard, reason);
            }

            // Check RAM capacity
            int totalRAM = build.RAM.CapacityGB;
            if (build.Motherboard.MaxMemoryGB > 0 && totalRAM > build.Motherboard.MaxMemoryGB)
            {
                var reason = $"Capacity too large ({totalRAM}GB > {build.Motherboard.MaxMemoryGB}GB).";
                result.Warnings.Add(reason);
                AddIssue("Warning", build.RAM, PartCategory.RAM, build.Motherboard, PartCategory.Motherboard, reason);
            }
        }

        // Check GPU and Case compatibility
        if (build.GPU != null && build.Case != null)
        {
            if (build.GPU.Length > build.Case.MaxGPULength)
            {
                result.IsCompatible = false;
                var reason = $"Too long ({build.GPU.Length}mm > {build.Case.MaxGPULength}mm).";
                result.Errors.Add(reason);
                AddIssue("Error", build.GPU, PartCategory.GPU, build.Case, PartCategory.Case, reason);
            }
        }

        // Check motherboard and case form factor compatibility
        if (build.Motherboard != null && build.Case != null)
        {
            // ATX case can fit MicroATX and MiniITX, but not vice versa
            bool formFactorCompatible = build.Case.FormFactor switch
            {
                Domain.Enums.FormFactor.EATX => true, // EATX supports all
                Domain.Enums.FormFactor.ATX => build.Motherboard.FormFactor != Domain.Enums.FormFactor.EATX,
                Domain.Enums.FormFactor.MicroATX => build.Motherboard.FormFactor == Domain.Enums.FormFactor.MicroATX || 
                                                     build.Motherboard.FormFactor == Domain.Enums.FormFactor.MiniITX,
                Domain.Enums.FormFactor.MiniITX => build.Motherboard.FormFactor == Domain.Enums.FormFactor.MiniITX,
                _ => false
            };

            if (!formFactorCompatible)
            {
                result.IsCompatible = false;
                var reason = $"Form factor not supported ({build.Motherboard.FormFactor} in {build.Case.FormFactor}).";
                result.Errors.Add(reason);
                AddIssue("Error", build.Motherboard, PartCategory.Motherboard, build.Case, PartCategory.Case, reason);
            }
        }

        // Check PSU wattage
        if (build.PSU != null)
        {
            int totalWattage = build.TotalWattage;
            int recommendedPSU = (int)(totalWattage * 1.3m); // 30% headroom
            
            if (build.PSU.WattageRating < totalWattage)
            {
                result.IsCompatible = false;
                var reason = $"Insufficient wattage ({build.PSU.WattageRating}W < {totalWattage}W).";
                result.Errors.Add(reason);
                AddIssue("Error", build.PSU, PartCategory.PSU, null, null, reason);
            }
            else if (build.PSU.WattageRating < recommendedPSU)
            {
                var reason = $"Below recommended wattage ({build.PSU.WattageRating}W < {recommendedPSU}W).";
                result.Warnings.Add(reason);
                AddIssue("Warning", build.PSU, PartCategory.PSU, null, null, reason);
            }
        }

        // Add notes
        if (build.CPU != null && !build.CPU.IntegratedGraphics && build.GPU == null)
        {
            var reason = "CPU does not have integrated graphics. A dedicated GPU is required.";
            result.Notes.Add(reason);
            AddIssue("Note", build.CPU, PartCategory.CPU, null, null, reason);
        }

        if (build.CPU != null && build.GPU == null && build.CPU.IntegratedGraphics)
        {
            var reason = "Using integrated graphics. Consider adding a dedicated GPU for better performance.";
            result.Notes.Add(reason);
            AddIssue("Note", build.CPU, PartCategory.CPU, null, null, reason);
        }

        return result;
    }
}
