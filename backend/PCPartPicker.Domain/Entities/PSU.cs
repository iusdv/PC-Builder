using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Domain.Entities;

public class PSU : Part
{
    public PSU()
    {
        Category = PartCategory.PSU;
    }

    public int WattageRating { get; set; }
    public string Efficiency { get; set; } = string.Empty; // 80+ Bronze, Gold, Platinum, etc.
    public bool Modular { get; set; }
    public FormFactor FormFactor { get; set; }
}
