namespace PCPartPicker.Application.DTOs;

public class CompatibilityCheckResult
{
    public bool IsCompatible { get; set; }
    public List<string> Warnings { get; set; } = new();
    public List<string> Errors { get; set; } = new();
    public List<string> Notes { get; set; } = new();
}
