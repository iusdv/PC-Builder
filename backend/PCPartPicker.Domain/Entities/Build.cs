namespace PCPartPicker.Domain.Entities;

public class Build : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ShareCode { get; set; } = string.Empty;  // Unique code for sharing
    
    // Selected parts (nullable - not all parts are required)
    public int? CPUId { get; set; }
    public CPU? CPU { get; set; }

    public int? CoolerId { get; set; }
    public Cooler? Cooler { get; set; }
    
    public int? MotherboardId { get; set; }
    public Motherboard? Motherboard { get; set; }
    
    public int? RAMId { get; set; }
    public RAM? RAM { get; set; }
    
    public int? GPUId { get; set; }
    public GPU? GPU { get; set; }
    
    public int? StorageId { get; set; }
    public Storage? Storage { get; set; }
    
    public int? PSUId { get; set; }
    public PSU? PSU { get; set; }
    
    public int? CaseId { get; set; }
    public Case? Case { get; set; }
    
    // Calculated fields
    public decimal TotalPrice { get; set; }
    public int TotalWattage { get; set; }
}
