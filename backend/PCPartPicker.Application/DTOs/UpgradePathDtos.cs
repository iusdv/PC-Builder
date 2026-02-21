using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Application.DTOs;

public class UpgradeStepDto
{

    public PartCategory Category { get; set; }

    public PartDto? CurrentPart { get; set; }

    public PartDto ProposedPart { get; set; } = null!;

    public decimal Cost { get; set; }

    public int WattageChange { get; set; }

    public double EstimatedFpsGainPercent { get; set; }


    public string Reason { get; set; } = string.Empty;
}

public class UpgradePathDto
{

    public string Name { get; set; } = string.Empty;


    public string Horizon { get; set; } = "immediate";

    public List<UpgradeStepDto> Steps { get; set; } = new();

    public decimal TotalCost { get; set; }

    public double TotalEstimatedFpsGainPercent { get; set; }

    public int FinalWattage { get; set; }

    public List<string> CompatibilityWarnings { get; set; } = new();

    public BottleneckAnalysisDto? PostUpgradeBottleneck { get; set; }


    public string Objective { get; set; } = string.Empty;
}


public class UpgradePathRequestDto
{

    public int BuildId { get; set; }


    public decimal? BudgetNow { get; set; }


    public decimal? BudgetLater { get; set; }

    public string Objective { get; set; } = "all";
}

public class UpgradePathResponseDto
{
    public int BuildId { get; set; }

    public BottleneckAnalysisDto CurrentBottleneck { get; set; } = null!;

    public List<UpgradePathDto> ImmediatePaths { get; set; } = new();

    public List<UpgradePathDto> ShortTermPaths { get; set; } = new();

    public List<UpgradePathDto> StagedPlans { get; set; } = new();
}
