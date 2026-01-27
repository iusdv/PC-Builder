using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Application.DTOs;

public class MotherboardDto : PartDto
{
    public SocketType Socket { get; set; }
    public string Chipset { get; set; } = string.Empty;
    public FormFactor FormFactor { get; set; }
    public RAMType MemoryType { get; set; }
    public int MemorySlots { get; set; }
    public int MaxMemoryGB { get; set; }
    public int PCIeSlots { get; set; }
    public int M2Slots { get; set; }
    public int SataSlots { get; set; }
}
