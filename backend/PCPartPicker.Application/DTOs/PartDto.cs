using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Application.DTOs;

public class PartDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public PartCategory Category { get; set; }
    public int Wattage { get; set; }
    public string? ProductUrl { get; set; }
}
