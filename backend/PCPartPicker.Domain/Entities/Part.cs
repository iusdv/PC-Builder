using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Domain.Entities;

public abstract class Part : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public PartCategory Category { get; set; }
    public int? Wattage { get; set; }  // TDP / power consumption when available
    public string? ProductUrl { get; set; }
}
