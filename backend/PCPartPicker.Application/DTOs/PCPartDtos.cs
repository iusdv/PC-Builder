namespace PCPartPicker.Application.DTOs;

public class PCPartDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int PowerConsumption { get; set; }
    public string? ImageUrl { get; set; }
    public Dictionary<string, object>? Specifications { get; set; }
}

public class CreatePCPartDto
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int PowerConsumption { get; set; }
    public string? ImageUrl { get; set; }
    public Dictionary<string, object>? Specifications { get; set; }
}

public class UpdatePCPartDto
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int PowerConsumption { get; set; }
    public string? ImageUrl { get; set; }
    public Dictionary<string, object>? Specifications { get; set; }
}
