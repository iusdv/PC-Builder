using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Application.DTOs;

public sealed class IncompatibilityDetailDto
{
    public PartCategory? WithCategory { get; set; }
    public int? WithPartId { get; set; }
    public string? WithPartName { get; set; }
    public string Reason { get; set; } = string.Empty;
}
