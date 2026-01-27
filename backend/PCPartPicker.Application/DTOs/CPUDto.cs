using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Application.DTOs;

public class CPUDto : PartDto
{
    public SocketType Socket { get; set; }
    public int CoreCount { get; set; }
    public int ThreadCount { get; set; }
    public decimal BaseClock { get; set; }
    public decimal BoostClock { get; set; }
    public bool IntegratedGraphics { get; set; }
}
