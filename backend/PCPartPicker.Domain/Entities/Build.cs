namespace PCPartPicker.Domain.Entities;

public class Build
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string ShareToken { get; set; } = string.Empty;
    public decimal TotalPrice { get; set; }
    public int TotalWattage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    public ICollection<BuildPart> BuildParts { get; set; } = new List<BuildPart>();
}
