using PCPartPicker.Application.Interfaces;
using PCPartPicker.Domain.Entities;

namespace PCPartPicker.Application.Services;

public class WattageEstimator : IWattageEstimator
{
    public int EstimateTotalWattage(Build build)
    {
        int total = 0;

        if (build.CPU != null) total += build.CPU.Wattage;
        if (build.GPU != null) total += build.GPU.Wattage;
        if (build.RAM != null) total += build.RAM.Wattage;
        if (build.Storage != null) total += build.Storage.Wattage;
        if (build.Motherboard != null) total += build.Motherboard.Wattage;

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
