using PCPartPicker.Domain.Entities;

namespace PCPartPicker.Application.Interfaces;

public interface IWattageEstimator
{
    int EstimateTotalWattage(Build build);
    int CalculateRecommendedPSUWattage(Build build);
}
