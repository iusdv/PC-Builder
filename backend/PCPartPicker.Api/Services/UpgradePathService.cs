using Microsoft.EntityFrameworkCore;
using PCPartPicker.Application.DTOs;
using PCPartPicker.Application.Interfaces;
using PCPartPicker.Domain.Entities;
using PCPartPicker.Domain.Enums;
using PCPartPicker.Infrastructure.Data;

namespace PCPartPicker.Api.Services;


public class UpgradePathService : IUpgradePathService
{
    private readonly ApplicationDbContext _db;
    private readonly IBottleneckService _bottleneck;
    private readonly ICompatibilityService _compatibility;
    private readonly IWattageEstimator _wattage;

    public UpgradePathService(
        ApplicationDbContext db,
        IBottleneckService bottleneck,
        ICompatibilityService compatibility,
        IWattageEstimator wattage)
    {
        _db = db;
        _bottleneck = bottleneck;
        _compatibility = compatibility;
        _wattage = wattage;
    }

    public async Task<UpgradePathResponseDto> GenerateUpgradePaths(Build build, UpgradePathRequestDto request)
    {
        var currentBottleneck = _bottleneck.Analyse(build);

        var response = new UpgradePathResponseDto
        {
            BuildId = build.Id,
            CurrentBottleneck = currentBottleneck,
        };

        var budgetNow = request.BudgetNow ?? 9999m;
        var budgetLater = request.BudgetLater ?? 9999m;
        var objective = (request.Objective ?? "all").ToLowerInvariant();
        var candidates = await GatherCandidates(build, budgetNow);

        //1-STEP (immediate)
        var immediates = new List<UpgradePathDto>();
        foreach (var (category, parts) in candidates)
        {
            foreach (var part in parts)
            {
                var step = BuildStep(build, category, part);
                if (step == null) continue;
                if (step.Cost > budgetNow) continue;

                var path = CreateSingleStepPath(build, step, objective);
                if (ShouldInclude(path, objective))
                    immediates.Add(path);
            }
        }

        response.ImmediatePaths = RankAndTrim(immediates, objective, 6);

        // 2-STEP (short-term)
        var shortTerms = new List<UpgradePathDto>();
        var topImmediates = response.ImmediatePaths.Take(3).ToList();
        foreach (var first in topImmediates)
        {
            var buildAfterFirst = ApplySteps(build, first.Steps);
            var secondBudget = budgetLater;

            var secondCandidates = await GatherCandidates(buildAfterFirst, secondBudget);
            foreach (var (category, parts) in secondCandidates)
            {
                if (first.Steps.Any(s => s.Category == category)) continue;

                foreach (var part in parts.Take(3))
                {
                    var step = BuildStep(buildAfterFirst, category, part);
                    if (step == null || step.Cost > secondBudget) continue;

                    var combined = new UpgradePathDto
                    {
                        Name = $"{first.Steps[0].Category} + {category} Upgrade",
                        Horizon = "short-term",
                        Steps = new List<UpgradeStepDto>(first.Steps) { step },
                        Objective = objective,
                    };

                    FinalizePathMetrics(build, combined);
                    if (ShouldInclude(combined, objective))
                        shortTerms.Add(combined);
                }
            }
        }
        response.ShortTermPaths = RankAndTrim(shortTerms, objective, 4);

        //STAGED PLANS
        var staged = BuildStagedPlans(build, candidates, budgetNow, budgetLater, objective);
        response.StagedPlans = RankAndTrim(staged, objective, 3);

        return response;
    }

    private async Task<Dictionary<PartCategory, List<Part>>> GatherCandidates(Build build, decimal maxCost)
    {
        var result = new Dictionary<PartCategory, List<Part>>();

        // CPU candidates – same socket as motherboard
        if (build.Motherboard != null)
        {
            var cpus = await _db.CPUs
                .Where(c => c.Socket == build.Motherboard.Socket)
                .Where(c => c.Price > (build.CPU != null ? build.CPU.Price * 0.9m : 0))
                .Where(c => build.CPU == null || c.Id != build.CPU.Id)
                .OrderByDescending(c => c.BoostClock * c.ThreadCount)
                .Take(8)
                .Cast<Part>()
                .ToListAsync();
            if (cpus.Any()) result[PartCategory.CPU] = cpus;
        }

        // GPU candidates
        {
            int? maxLen = build.Case?.MaxGPULength;
            var query = _db.GPUs
                .Where(g => build.GPU == null || g.Id != build.GPU.Id)
                .Where(g => g.Price > (build.GPU != null ? build.GPU.Price * 0.9m : 0));

            if (maxLen.HasValue)
                query = query.Where(g => g.Length <= maxLen.Value);

            var gpus = await query
                .OrderByDescending(g => g.BoostClock * g.MemoryGB)
                .Take(8)
                .Cast<Part>()
                .ToListAsync();
            if (gpus.Any()) result[PartCategory.GPU] = gpus;
        }

        // RAM candidates – same type as motherboard
        if (build.Motherboard != null)
        {
            var rams = await _db.RAMs
                .Where(r => r.Type == build.Motherboard.MemoryType)
                .Where(r => r.Price > (build.RAM != null ? build.RAM.Price * 0.8m : 0))
                .Where(r => build.RAM == null || r.Id != build.RAM.Id)
                .OrderByDescending(r => r.SpeedMHz * r.CapacityGB)
                .Take(6)
                .Cast<Part>()
                .ToListAsync();
            if (rams.Any()) result[PartCategory.RAM] = rams;
        }

        {
            var storages = await _db.Storages
                .Where(s => s.Price > (build.Storage != null ? build.Storage.Price * 0.8m : 0))
                .Where(s => build.Storage == null || s.Id != build.Storage.Id)
                .OrderByDescending(s => s.CapacityGB)
                .Take(5)
                .Cast<Part>()
                .ToListAsync();
            if (storages.Any()) result[PartCategory.Storage] = storages;
        }

        if (build.PSU != null)
        {
            int recommendedW = _wattage.CalculateRecommendedPSUWattage(build);
            if (build.PSU.WattageRating < recommendedW * 1.05)
            {
                var psus = await _db.PSUs
                    .Where(p => p.WattageRating > build.PSU.WattageRating)
                    .Where(p => p.Id != build.PSU.Id)
                    .OrderBy(p => p.Price)
                    .Take(4)
                    .Cast<Part>()
                    .ToListAsync();
                if (psus.Any()) result[PartCategory.PSU] = psus;
            }
        }
        if (build.CPU != null)
        {
            var coolers = await _db.Coolers
                .Where(c => c.Socket == build.CPU.Socket || c.Socket == SocketType.Unknown)
                .Where(c => c.Price > (build.Cooler != null ? build.Cooler.Price * 0.8m : 0))
                .Where(c => build.Cooler == null || c.Id != build.Cooler.Id)
                .OrderByDescending(c => c.HeightMM)
                .Take(4)
                .Cast<Part>()
                .ToListAsync();
            if (coolers.Any()) result[PartCategory.Cooler] = coolers;
        }

        return result;
    }

    private UpgradeStepDto? BuildStep(Build build, PartCategory category, Part proposed)
    {
        var current = GetCurrentPart(build, category);
        var currentPrice = current?.Price ?? 0m;
        var cost = proposed.Price - currentPrice;

        if (cost < -50m) return null;

        var wattDelta = (proposed.Wattage ?? 0) - (current?.Wattage ?? 0);
        var fpsGain = EstimateFpsGain(build, category, proposed);

        return new UpgradeStepDto
        {
            Category = category,
            CurrentPart = current != null ? MapPartDto(current) : null,
            ProposedPart = MapPartDto(proposed),
            Cost = cost,
            WattageChange = wattDelta,
            EstimatedFpsGainPercent = fpsGain,
            Reason = GenerateReason(category, current, proposed, fpsGain),
        };
    }
    private List<UpgradePathDto> BuildStagedPlans(
        Build build,
        Dictionary<PartCategory, List<Part>> candidates,
        decimal budgetNow,
        decimal budgetLater,
        string objective)
    {
        var plans = new List<UpgradePathDto>();
        var bn = _bottleneck.Analyse(build);
        var primaryCategory = bn.Bottleneck switch
        {
            "CPU" => PartCategory.CPU,
            "GPU" => PartCategory.GPU,
            "RAM" => PartCategory.RAM,
            _ => PartCategory.GPU 
        };

        var secondaryCategories = new[] { PartCategory.CPU, PartCategory.GPU, PartCategory.RAM, PartCategory.Storage }
            .Where(c => c != primaryCategory && candidates.ContainsKey(c))
            .Take(2)
            .ToList();

        if (candidates.TryGetValue(primaryCategory, out var primaryParts))
        {
            foreach (var primaryPart in primaryParts.Take(2))
            {
                var step1 = BuildStep(build, primaryCategory, primaryPart);
                if (step1 == null || step1.Cost > budgetNow) continue;

                var buildAfterStep1 = ApplySteps(build, new List<UpgradeStepDto> { step1 });
                var steps = new List<UpgradeStepDto> { step1 };

                decimal remainingBudget = budgetLater;
                foreach (var secCat in secondaryCategories)
                {
                    if (!candidates.TryGetValue(secCat, out var secParts)) continue;
                    var bestSec = secParts.FirstOrDefault(p =>
                    {
                        var s = BuildStep(buildAfterStep1, secCat, p);
                        return s != null && s.Cost <= remainingBudget;
                    });
                    if (bestSec == null) continue;

                    var secStep = BuildStep(buildAfterStep1, secCat, bestSec);
                    if (secStep == null) continue;

                    steps.Add(secStep);
                    remainingBudget -= secStep.Cost;
                    buildAfterStep1 = ApplySteps(buildAfterStep1, new List<UpgradeStepDto> { secStep });
                }

                if (steps.Count >= 2)
                {
                    var plan = new UpgradePathDto
                    {
                        Name = $"Staged: {primaryCategory} first, then {string.Join(" + ", secondaryCategories.Select(c => c.ToString()))}",
                        Horizon = "staged",
                        Steps = steps,
                        Objective = objective,
                    };
                    FinalizePathMetrics(build, plan);
                    plans.Add(plan);
                }
            }
        }

        return plans;
    }
    private UpgradePathDto CreateSingleStepPath(Build build, UpgradeStepDto step, string objective)
    {
        var path = new UpgradePathDto
        {
            Name = $"{step.Category} Upgrade",
            Horizon = "immediate",
            Steps = new List<UpgradeStepDto> { step },
            Objective = objective,
        };
        FinalizePathMetrics(build, path);
        return path;
    }

    private void FinalizePathMetrics(Build originalBuild, UpgradePathDto path)
    {
        path.TotalCost = path.Steps.Sum(s => s.Cost);
        path.TotalEstimatedFpsGainPercent = path.Steps.Sum(s => s.EstimatedFpsGainPercent);

        var finalBuild = ApplySteps(originalBuild, path.Steps);
        path.FinalWattage = _wattage.EstimateTotalWattage(finalBuild);
        path.PostUpgradeBottleneck = _bottleneck.Analyse(finalBuild);

        var compat = _compatibility.CheckCompatibility(finalBuild);
        path.CompatibilityWarnings = compat.Errors.Concat(compat.Warnings).ToList();
    }

    private Build ApplySteps(Build original, List<UpgradeStepDto> steps)
    {
        // Create a shallow clone with the same parts
        var clone = new Build
        {
            Id = original.Id,
            Name = original.Name,
            CPU = original.CPU,
            CPUId = original.CPUId,
            GPU = original.GPU,
            GPUId = original.GPUId,
            RAM = original.RAM,
            RAMId = original.RAMId,
            Motherboard = original.Motherboard,
            MotherboardId = original.MotherboardId,
            Cooler = original.Cooler,
            CoolerId = original.CoolerId,
            Storage = original.Storage,
            StorageId = original.StorageId,
            PSU = original.PSU,
            PSUId = original.PSUId,
            Case = original.Case,
            CaseId = original.CaseId,
            CaseFan = original.CaseFan,
            CaseFanId = original.CaseFanId,
            TotalPrice = original.TotalPrice,
            TotalWattage = original.TotalWattage,
        };

        foreach (var step in steps)
        {
            SetPartOnBuild(clone, step.Category, step.ProposedPart.Id);
        }

        clone.TotalWattage = _wattage.EstimateTotalWattage(clone);
        clone.TotalPrice = CalculateTotalPrice(clone);
        return clone;
    }

    private void SetPartOnBuild(Build build, PartCategory category, int partId)
    {
        switch (category)
        {
            case PartCategory.CPU:
                var cpu = _db.CPUs.Local.FirstOrDefault(p => p.Id == partId)
                    ?? _db.CPUs.Find(partId);
                build.CPU = cpu;
                build.CPUId = cpu?.Id;
                break;
            case PartCategory.GPU:
                var gpu = _db.GPUs.Local.FirstOrDefault(p => p.Id == partId)
                    ?? _db.GPUs.Find(partId);
                build.GPU = gpu;
                build.GPUId = gpu?.Id;
                break;
            case PartCategory.RAM:
                var ram = _db.RAMs.Local.FirstOrDefault(p => p.Id == partId)
                    ?? _db.RAMs.Find(partId);
                build.RAM = ram;
                build.RAMId = ram?.Id;
                break;
            case PartCategory.Storage:
                var storage = _db.Storages.Local.FirstOrDefault(p => p.Id == partId)
                    ?? _db.Storages.Find(partId);
                build.Storage = storage;
                build.StorageId = storage?.Id;
                break;
            case PartCategory.PSU:
                var psu = _db.PSUs.Local.FirstOrDefault(p => p.Id == partId)
                    ?? _db.PSUs.Find(partId);
                build.PSU = psu;
                build.PSUId = psu?.Id;
                break;
            case PartCategory.Cooler:
                var cooler = _db.Coolers.Local.FirstOrDefault(p => p.Id == partId)
                    ?? _db.Coolers.Find(partId);
                build.Cooler = cooler;
                build.CoolerId = cooler?.Id;
                break;
            case PartCategory.Case:
                var pcCase = _db.Cases.Local.FirstOrDefault(p => p.Id == partId)
                    ?? _db.Cases.Find(partId);
                build.Case = pcCase;
                build.CaseId = pcCase?.Id;
                break;
            case PartCategory.Motherboard:
                var mb = _db.Motherboards.Local.FirstOrDefault(p => p.Id == partId)
                    ?? _db.Motherboards.Find(partId);
                build.Motherboard = mb;
                build.MotherboardId = mb?.Id;
                break;
        }
    }

    private static decimal CalculateTotalPrice(Build build)
    {
        decimal total = 0;
        if (build.CPU != null) total += build.CPU.Price;
        if (build.GPU != null) total += build.GPU.Price;
        if (build.RAM != null) total += build.RAM.Price;
        if (build.Motherboard != null) total += build.Motherboard.Price;
        if (build.Cooler != null) total += build.Cooler.Price;
        if (build.Storage != null) total += build.Storage.Price;
        if (build.PSU != null) total += build.PSU.Price;
        if (build.Case != null) total += build.Case.Price;
        if (build.CaseFan != null) total += build.CaseFan.Price;
        return total;
    }

    private static Part? GetCurrentPart(Build build, PartCategory category) => category switch
    {
        PartCategory.CPU => build.CPU,
        PartCategory.GPU => build.GPU,
        PartCategory.RAM => build.RAM,
        PartCategory.Storage => build.Storage,
        PartCategory.PSU => build.PSU,
        PartCategory.Cooler => build.Cooler,
        PartCategory.Case => build.Case,
        PartCategory.Motherboard => build.Motherboard,
        PartCategory.CaseFan => build.CaseFan,
        _ => null,
    };

    /// <summary>
    /// Rough FPS gain estimator.  Uses spec ratios (clock, VRAM, threads) to approximate
    /// percentage improvement.  This is intentionally heuristic, not benchmark-based.
    /// </summary>
    private static double EstimateFpsGain(Build build, PartCategory category, Part proposed)
    {
        switch (category)
        {
            case PartCategory.GPU:
            {
                var curr = build.GPU;
                if (curr == null) return 35.0; // going from iGPU → dGPU
                var prop = proposed as GPU;
                if (prop == null) return 0;

                double clockRatio = curr.BoostClock > 0 ? (double)prop.BoostClock / curr.BoostClock : 1;
                double vramRatio = curr.MemoryGB > 0 ? (double)prop.MemoryGB / curr.MemoryGB : 1;
                double gain = ((clockRatio - 1) * 40) + ((vramRatio - 1) * 25);
                return Math.Round(Math.Max(0, gain), 1);
            }
            case PartCategory.CPU:
            {
                var curr = build.CPU;
                if (curr == null) return 15.0;
                var prop = proposed as CPU;
                if (prop == null) return 0;

                double clockRatio = curr.BoostClock > 0 ? (double)prop.BoostClock / (double)curr.BoostClock : 1;
                double threadRatio = curr.ThreadCount > 0 ? (double)prop.ThreadCount / curr.ThreadCount : 1;
                double gain = ((clockRatio - 1) * 25) + ((threadRatio - 1) * 15);
                return Math.Round(Math.Max(0, gain), 1);
            }
            case PartCategory.RAM:
            {
                var curr = build.RAM;
                if (curr == null) return 8.0;
                var prop = proposed as RAM;
                if (prop == null) return 0;

                double speedRatio = curr.SpeedMHz > 0 ? (double)prop.SpeedMHz / curr.SpeedMHz : 1;
                double capRatio = curr.CapacityGB > 0 ? (double)prop.CapacityGB / curr.CapacityGB : 1;
                double gain = ((speedRatio - 1) * 10) + ((capRatio - 1) * 5);
                return Math.Round(Math.Max(0, gain), 1);
            }
            default:
                return 0;
        }
    }

    private static string GenerateReason(PartCategory category, Part? current, Part proposed, double fpsGain)
    {
        var from = current?.Name ?? "(empty)";
        var to = proposed.Name;
        var fpsText = fpsGain > 0 ? $" (~{fpsGain:F0}% FPS gain)" : "";

        return category switch
        {
            PartCategory.GPU => $"Upgrade GPU from {from} → {to}{fpsText}. Bigger VRAM & faster clocks improve frame rates at higher resolutions.",
            PartCategory.CPU => $"Upgrade CPU from {from} → {to}{fpsText}. More threads/higher clocks help in CPU-bound scenes and multitasking.",
            PartCategory.RAM => $"Upgrade RAM from {from} → {to}{fpsText}. Faster/larger RAM reduces stuttering and improves 1% lows.",
            PartCategory.PSU => $"Upgrade PSU from {from} → {to}. More headroom for future upgrades and stable power delivery.",
            PartCategory.Cooler => $"Upgrade cooler from {from} → {to}. Better thermals allow sustained boost clocks.",
            PartCategory.Storage => $"Upgrade storage from {from} → {to}. Faster load times and larger capacity.",
            _ => $"Upgrade {category} from {from} → {to}.",
        };
    }

    private static PartDto MapPartDto(Part part) => new()
    {
        Id = part.Id,
        Name = part.Name,
        Manufacturer = part.Manufacturer,
        Price = part.Price,
        ImageUrl = part.ImageUrl,
        Category = part.Category,
        Wattage = part.Wattage,
        ProductUrl = part.ProductUrl,
    };

    private static bool ShouldInclude(UpgradePathDto path, string objective)
    {
        if (path.TotalCost <= 0 && path.TotalEstimatedFpsGainPercent <= 0) return false;
        if (path.CompatibilityWarnings.Any(w => w.Contains("mismatch", StringComparison.OrdinalIgnoreCase))) return false;
        return true;
    }

    private static List<UpgradePathDto> RankAndTrim(List<UpgradePathDto> paths, string objective, int max)
    {
        IEnumerable<UpgradePathDto> sorted = objective switch
        {
            "fps-per-dollar" => paths
                .Where(p => p.TotalCost > 0)
                .OrderByDescending(p => p.TotalEstimatedFpsGainPercent / (double)p.TotalCost),
            "min-wattage" => paths.OrderBy(p => p.FinalWattage),
            "future-proof" => paths.OrderByDescending(p =>
                p.TotalEstimatedFpsGainPercent * 0.5 + (p.PostUpgradeBottleneck?.CpuScore ?? 0) * 0.25 + (p.PostUpgradeBottleneck?.GpuScore ?? 0) * 0.25),
            _ => paths.OrderByDescending(p => p.TotalEstimatedFpsGainPercent),
        };

        return sorted.Take(max).ToList();
    }
}
