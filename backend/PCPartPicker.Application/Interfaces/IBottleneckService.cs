using PCPartPicker.Application.DTOs;
using PCPartPicker.Domain.Entities;

namespace PCPartPicker.Application.Interfaces;

public interface IBottleneckService
{
    BottleneckAnalysisDto Analyse(Build build);
}
