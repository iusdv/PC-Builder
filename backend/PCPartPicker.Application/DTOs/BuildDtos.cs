namespace PCPartPicker.Application.DTOs;

public class BuildDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ShareToken { get; set; } = string.Empty;
    public decimal TotalPrice { get; set; }
    public int TotalWattage { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<BuildPartDto> Parts { get; set; } = new();
}

public class BuildPartDto
{
    public PCPartDto Part { get; set; } = null!;
    public int Quantity { get; set; }
}

public class CreateBuildDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class AddPartToBuildDto
{
    public int PCPartId { get; set; }
    public int Quantity { get; set; } = 1;
}

public class CompatibilityWarning
{
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
}
