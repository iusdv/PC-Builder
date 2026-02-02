namespace PCPartScraper.Models;

public sealed class ProductScrapeResult
{
    public string Query { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Manufacturer { get; set; }
    public string? ProductUrl { get; set; }
    public string? ImageUrl { get; set; }
    public decimal? Price { get; set; }
    public int? Wattage { get; set; }
    public Dictionary<string, string> Specs { get; set; } = new();
    public string? MatchedText { get; set; }
    public double? Score { get; set; }
}
