using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Domain.Entities;

public class CPU : Part
{
    public CPU()
    {
        Category = PartCategory.CPU;
    }

    public SocketType Socket { get; set; }
    public int CoreCount { get; set; }
    public int ThreadCount { get; set; }
    public decimal BaseClock { get; set; }  // GHz
    public decimal BoostClock { get; set; } // GHz
    public bool IntegratedGraphics { get; set; }
}
