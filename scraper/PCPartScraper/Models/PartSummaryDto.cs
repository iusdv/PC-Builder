namespace PCPartScraper.Models;

public sealed class PartSummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public int? Wattage { get; set; }
    public string? ProductUrl { get; set; }
}
