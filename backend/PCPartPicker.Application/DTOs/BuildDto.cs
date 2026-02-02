namespace PCPartPicker.Application.DTOs;

public class BuildDto
{
    public int? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ShareCode { get; set; }
    
    public int? CPUId { get; set; }
    public int? CoolerId { get; set; }
    public int? MotherboardId { get; set; }
    public int? RAMId { get; set; }
    public int? GPUId { get; set; }
    public int? StorageId { get; set; }
    public int? PSUId { get; set; }
    public int? CaseId { get; set; }
    public int? CaseFanId { get; set; }
    
    public decimal TotalPrice { get; set; }
    public int TotalWattage { get; set; }
}
