namespace PCPartPicker.Application.DTOs;

public class BottleneckAnalysisDto
{
 
    public string Bottleneck { get; set; } = "Unknown";

    public int CpuScore { get; set; }

    public int GpuScore { get; set; }

    public int RamScore { get; set; }

    public double BalanceRatio { get; set; }
    public string Summary { get; set; } = string.Empty;
}
