using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Domain.Entities;

public class RAM : Part
{
    public RAM()
    {
        Category = PartCategory.RAM;
    }

    public RAMType Type { get; set; }
    public int SpeedMHz { get; set; }
    public int CapacityGB { get; set; }
    public int ModuleCount { get; set; }  // e.g., 2x8GB kit = 2 modules
    public int CASLatency { get; set; }
}
