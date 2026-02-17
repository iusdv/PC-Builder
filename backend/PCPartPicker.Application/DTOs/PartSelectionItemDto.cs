using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Application.DTOs;

public sealed class PartSelectionItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public PartCategory Category { get; set; }

    public Dictionary<string, string> Specs { get; set; } = new();

    public bool IsCompatible { get; set; }
    public List<string> IncompatibilityReasons { get; set; } = new();

    public List<IncompatibilityDetailDto> IncompatibilityDetails { get; set; } = new();
}
