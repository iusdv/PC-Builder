using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Domain.Entities;

public class Cooler : Part
{
    public Cooler()
    {
        Category = PartCategory.Cooler;
    }

    public SocketType Socket { get; set; }
    public string CoolerType { get; set; } = string.Empty; // Air, AIO, etc.
    public int HeightMM { get; set; }
    public int? RadiatorSizeMM { get; set; } // For AIO (e.g., 240, 360)
}
