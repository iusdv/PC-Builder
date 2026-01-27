using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Domain.Entities;

public class Storage : Part
{
    public Storage()
    {
        Category = PartCategory.Storage;
    }

    public string Type { get; set; } = string.Empty;  // SSD, HDD, NVMe
    public int CapacityGB { get; set; }
    public string Interface { get; set; } = string.Empty; // M.2, SATA, PCIe
    public int? ReadSpeedMBps { get; set; }
    public int? WriteSpeedMBps { get; set; }
}
