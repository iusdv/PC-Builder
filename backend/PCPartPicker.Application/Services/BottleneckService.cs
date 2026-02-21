using PCPartPicker.Application.DTOs;
using PCPartPicker.Application.Interfaces;
using PCPartPicker.Domain.Entities;

namespace PCPartPicker.Application.Services;

public class BottleneckService : IBottleneckService
{
    private static int ScoreCpu(CPU cpu)
    {
        double threads = cpu.ThreadCount;
        double boost = (double)cpu.BoostClock;
        double raw = (threads * 1.6) + (boost * 8.0);
        return Math.Clamp((int)Math.Round(raw), 1, 100);
    }
    private static int ScoreGpu(GPU gpu)
    {
        double vram = gpu.MemoryGB;
        double boost = gpu.BoostClock; // MHz
        double tdp = gpu.Wattage ?? 150;
        double raw = (vram * 3.5) + (boost * 0.025) + (tdp * 0.06);
        return Math.Clamp((int)Math.Round(raw * 100.0 / 175.0), 1, 100);
    }
    private static int ScoreRam(RAM ram)
    {
        double cap = ram.CapacityGB;
        double speed = ram.SpeedMHz;

        double raw = (cap * 0.9) + (speed * 0.008);
        return Math.Clamp((int)Math.Round(raw), 1, 100);
    }

    public BottleneckAnalysisDto Analyse(Build build)
    {
        var result = new BottleneckAnalysisDto();

        int cpuScore = build.CPU != null ? ScoreCpu(build.CPU) : 0;
        int gpuScore = build.GPU != null ? ScoreGpu(build.GPU) : 0;
        int ramScore = build.RAM != null ? ScoreRam(build.RAM) : 0;

        result.CpuScore = cpuScore;
        result.GpuScore = gpuScore;
        result.RamScore = ramScore;

        if (cpuScore == 0 && gpuScore == 0)
        {
            result.Bottleneck = "Unknown";
            result.Summary = "Not enough parts to analyse bottleneck.";
            return result;
        }

        // Balance ratio = gpu / cpu.  > 1 means GPU outpaces CPU (CPU bottleneck).
        double ratio = cpuScore > 0 ? (double)gpuScore / cpuScore : 0;
        result.BalanceRatio = Math.Round(ratio, 2);

        const double cpuBottleneckThreshold = 1.35;
        const double gpuBottleneckThreshold = 0.65;

        if (gpuScore == 0)
        {
            result.Bottleneck = "GPU";
            result.Summary = "No dedicated GPU — the build is severely GPU-limited.";
        }
        else if (ratio > cpuBottleneckThreshold)
        {
            result.Bottleneck = "CPU";
            result.Summary = $"The CPU can't keep up with the GPU. " +
                             "Upgrading the CPU would yield the biggest FPS gain.";
        }
        else if (ratio < gpuBottleneckThreshold)
        {
            result.Bottleneck = "GPU";
            result.Summary = $"The GPU is holding back the CPU. " +
                             "Upgrading the GPU would yield the biggest FPS gain.";
        }
        else
        {
            result.Bottleneck = "Balanced";
            result.Summary = "CPU and GPU are well-balanced.";
        }

        // Check RAM as secondary bottleneck
        if (ramScore > 0 && ramScore < 25 && (cpuScore > 50 || gpuScore > 50))
        {
            result.Bottleneck = result.Bottleneck == "Balanced" ? "RAM" : result.Bottleneck;
            result.Summary += " RAM may also be a limiting factor (low capacity/speed).";
        }

        return result;
    }
}
