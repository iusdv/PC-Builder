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

        // Check CPU and Motherboard socket compatibility
        if (build.CPU != null && build.Motherboard != null)
        {
            if (build.CPU.Socket != build.Motherboard.Socket)
            {
                result.IsCompatible = false;
                result.Errors.Add($"CPU socket ({build.CPU.Socket}) is not compatible with motherboard socket ({build.Motherboard.Socket})");
            }
        }

        // Check CPU and Cooler socket compatibility
        if (build.CPU != null && build.Cooler != null)
        {
            if (build.Cooler.Socket != SocketType.Unknown && build.CPU.Socket != build.Cooler.Socket)
            {
                result.IsCompatible = false;
                result.Errors.Add($"CPU socket ({build.CPU.Socket}) is not compatible with CPU cooler socket ({build.Cooler.Socket})");
            }
        }

        // Check RAM type compatibility
        if (build.RAM != null && build.Motherboard != null)
        {
            if (build.RAM.Type != build.Motherboard.MemoryType)
            {
                result.IsCompatible = false;
                result.Errors.Add($"RAM type ({build.RAM.Type}) is not compatible with motherboard ({build.Motherboard.MemoryType})");
            }

            // Check RAM capacity
            int totalRAM = build.RAM.CapacityGB;
            if (build.Motherboard.MaxMemoryGB > 0 && totalRAM > build.Motherboard.MaxMemoryGB)
            {
                result.Warnings.Add($"RAM capacity ({totalRAM}GB) exceeds motherboard maximum ({build.Motherboard.MaxMemoryGB}GB)");
            }
        }

        // Check GPU and Case compatibility
        if (build.GPU != null && build.Case != null)
        {
            if (build.GPU.Length > build.Case.MaxGPULength)
            {
                result.IsCompatible = false;
                result.Errors.Add($"GPU length ({build.GPU.Length}mm) exceeds case maximum ({build.Case.MaxGPULength}mm)");
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
                result.Errors.Add($"Motherboard form factor ({build.Motherboard.FormFactor}) is not compatible with case ({build.Case.FormFactor})");
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
                result.Errors.Add($"PSU wattage ({build.PSU.WattageRating}W) is insufficient for estimated consumption ({totalWattage}W)");
            }
            else if (build.PSU.WattageRating < recommendedPSU)
            {
                result.Warnings.Add($"PSU wattage ({build.PSU.WattageRating}W) is below recommended ({recommendedPSU}W with 30% headroom)");
            }
        }

        // Add notes
        if (build.CPU != null && !build.CPU.IntegratedGraphics && build.GPU == null)
        {
            result.Notes.Add("CPU does not have integrated graphics. A dedicated GPU is required.");
        }

        if (build.CPU != null && build.GPU == null && build.CPU.IntegratedGraphics)
        {
            result.Notes.Add("Using integrated graphics. Consider adding a dedicated GPU for better performance.");
        }

        return result;
    }
}
