using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Application.DTOs;

public sealed class CompatibilityIssueDto
{
    public string Severity { get; set; } = "Error"; // Error | Warning | Note

    public PartCategory PartCategory { get; set; }
    public int? PartId { get; set; }
    public string? PartName { get; set; }

    public PartCategory? WithCategory { get; set; }
    public int? WithPartId { get; set; }
    public string? WithPartName { get; set; }

    public string Reason { get; set; } = string.Empty;
}
