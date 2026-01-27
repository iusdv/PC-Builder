using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Domain.Entities;

public class GPU : Part
{
    public GPU()
    {
        Category = PartCategory.GPU;
    }

    public string Chipset { get; set; } = string.Empty;
    public int MemoryGB { get; set; }
    public string MemoryType { get; set; } = string.Empty; // GDDR6, GDDR6X
    public int CoreClock { get; set; }  // MHz
    public int BoostClock { get; set; } // MHz
    public int Length { get; set; }     // mm for case compatibility
    public int Slots { get; set; }      // PCIe slots occupied (usually 2 or 3)
}
