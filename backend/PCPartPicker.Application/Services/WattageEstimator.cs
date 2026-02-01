using PCPartPicker.Application.Interfaces;
using PCPartPicker.Domain.Entities;

namespace PCPartPicker.Application.Services;

public class WattageEstimator : IWattageEstimator
{
    public int EstimateTotalWattage(Build build)
    {
        int total = 0;

        if (build.CPU?.Wattage is int cpuW) total += cpuW;
        // Cooler wattage is inconsistently represented by vendors (sometimes cooling capacity/TDP).
        // Only count it when it looks like an actual electrical draw.
        if (build.Cooler?.Wattage is int coolerW && coolerW is > 0 and <= 50) total += coolerW;
        if (build.GPU?.Wattage is int gpuW) total += gpuW;
        if (build.Storage?.Wattage is int storageW) total += storageW;

        // Add base system overhead (fans, RGB, etc.)
        total += 50;

        return total;
    }

    public int CalculateRecommendedPSUWattage(Build build)
    {
        int totalWattage = EstimateTotalWattage(build);
        // Add 30% headroom for efficiency and future upgrades
        return (int)(totalWattage * 1.3m);
    }
}
