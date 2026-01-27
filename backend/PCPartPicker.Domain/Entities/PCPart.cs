namespace PCPartPicker.Domain.Entities;

public class PCPart
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int PowerConsumption { get; set; }
    public string? ImageUrl { get; set; }
    public string Specifications { get; set; } = "{}";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    public ICollection<BuildPart> BuildParts { get; set; } = new List<BuildPart>();
}
