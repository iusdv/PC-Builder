namespace PCPartScraper.Models;

public class PartData
{
    public string Name { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public int Wattage { get; set; }
    public string? ProductUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public Dictionary<string, string> Specs { get; set; } = new();
}
