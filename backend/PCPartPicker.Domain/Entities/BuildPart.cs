namespace PCPartPicker.Domain.Entities;

public class BuildPart
{
    public int Id { get; set; }
    public int BuildId { get; set; }
    public Build Build { get; set; } = null!;
    public int PCPartId { get; set; }
    public PCPart PCPart { get; set; } = null!;
    public int Quantity { get; set; } = 1;
}
