using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Domain.Entities;

public class Case : Part
{
    public Case()
    {
        Category = PartCategory.Case;
    }

    public FormFactor FormFactor { get; set; }
    public int MaxGPULength { get; set; } // mm
    public int? MaxCoolerHeightMM { get; set; } // mm (CPU air cooler clearance)
    public string Color { get; set; } = string.Empty;
    public bool HasSidePanel { get; set; }
}
