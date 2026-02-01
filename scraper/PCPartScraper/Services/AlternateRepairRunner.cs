using System.Globalization;
using System.Text.Json.Nodes;
using PCPartScraper.Models;

namespace PCPartScraper.Services;

public sealed class AlternateRepairRunner
{
    private readonly PartsApiClient _api;
    private readonly AlternateScrapeService _alternate;
    private readonly DiskJsonCache<ProductScrapeResult> _cache;

    public AlternateRepairRunner(
        PartsApiClient api,
        AlternateScrapeService alternate,
        DiskJsonCache<ProductScrapeResult> cache)
    {
        _api = api;
        _alternate = alternate;
        _cache = cache;
    }

    public async Task RunAsync(
        IReadOnlyList<int> categories,
        int maxUpdates,
        bool fillSpecs,
        bool dryRun,
        bool forceRepair,
        CancellationToken cancellationToken = default)
    {
        var wanted = new HashSet<int>(categories);

        var parts = await _api.GetAllPartsAsync(cancellationToken: cancellationToken);
        Console.WriteLine($"[repair] parts total={parts.Count}");

        var updated = 0;
        var skipped = 0;
        var errors = 0;

        foreach (var part in parts)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var categoryId = PartsApiClient.ParseCategory(part.Category);
            if (categoryId < 0)
            {
                skipped++;
                continue;
            }

            if (!wanted.Contains(categoryId))
            {
                skipped++;
                continue;
            }

            if (string.IsNullOrWhiteSpace(part.ProductUrl) || !part.ProductUrl.Contains("alternate.nl", StringComparison.OrdinalIgnoreCase))
            {
                skipped++;
                continue;
            }

            if (updated >= maxUpdates)
            {
                Console.WriteLine($"[repair] reached maxUpdates={maxUpdates}");
                break;
            }

            JsonNode? details;
            try
            {
                details = await _api.GetPartDetailsAsJsonAsync(part, cancellationToken);
            }
            catch (Exception ex)
            {
                errors++;
                Console.WriteLine($"[repair] ERROR get details id={part.Id} cat={PartsApiClient.CategoryName(categoryId)}: {ex.Message}");
                continue;
            }

            if (details is not JsonObject obj)
            {
                skipped++;
                continue;
            }

            if (!forceRepair && !ShouldRepair(categoryId, obj))
            {
                skipped++;
                continue;
            }

            ProductScrapeResult scrape;
            try
            {
                if (!_cache.TryGet(part.ProductUrl, out scrape))
                {
                    scrape = await _alternate.ScrapeProductAsync(part.ProductUrl, query: part.Name, cancellationToken);
                    _cache.Set(part.ProductUrl, scrape);
                }
            }
            catch (Exception ex)
            {
                errors++;
                Console.WriteLine($"[repair] ERROR scrape {part.ProductUrl}: {ex.Message}");
                continue;
            }

            if (!fillSpecs)
            {
                skipped++;
                continue;
            }

            var changed = PartSpecMapper.ApplyRepairSpecsToPartJson(categoryId, obj, scrape);
            if (!changed)
            {
                skipped++;
                continue;
            }

            Console.WriteLine($"[repair] updating id={part.Id} cat={PartsApiClient.CategoryName(categoryId)} name={part.Name}");

            if (dryRun)
            {
                updated++;
                continue;
            }

            try
            {
                var ok = await _api.PutPartDetailsJsonAsync(part, obj, cancellationToken);
                if (ok) updated++;
                else errors++;
            }
            catch (Exception ex)
            {
                errors++;
                Console.WriteLine($"[repair] ERROR put id={part.Id}: {ex.Message}");
            }
        }

        try
        {
            await _cache.SaveAsync(cancellationToken);
        }
        catch
        {
            // ignore cache save errors
        }

        Console.WriteLine($"[repair] done updated={updated} skipped={skipped} errors={errors}");
    }

    private static bool ShouldRepair(int category, JsonObject obj)
    {
        // CPU: fix old imports where coreCount stayed 0
        if (category == 0)
        {
            var cc = 0;
            _ = int.TryParse(obj["coreCount"]?.ToString(), out cc);
            var boost = 0m;
            _ = decimal.TryParse(obj["boostClock"]?.ToString(), NumberStyles.Number, CultureInfo.InvariantCulture, out boost);
            var watts = 0;
            _ = int.TryParse(obj["wattage"]?.ToString(), out watts);
            var socketRaw = (obj["socket"]?.ToString() ?? string.Empty).Trim();
            var socketUnknown = string.IsNullOrWhiteSpace(socketRaw)
                || socketRaw.Equals("Unknown", StringComparison.OrdinalIgnoreCase)
                || socketRaw.Equals("0", StringComparison.OrdinalIgnoreCase);

            return cc <= 0 || boost <= 0m || watts <= 0 || socketUnknown;
        }

        // Storage: old imports could have TB parsed as a tiny GB number (e.g. 4 TB -> 4 GB)
        if (category == 4)
        {
            var cap = 0;
            _ = int.TryParse(obj["capacityGB"]?.ToString(), out cap);
            return cap <= 0 || cap < 64;
        }

        // Case: backfill max GPU length when missing/0
        if (category == 6)
        {
            var mm = 0;
            _ = int.TryParse(obj["maxGPULength"]?.ToString(), out mm);
            if (mm <= 0) return true;

            // Also repair cases when we still have Dutch color values (English-only UI requirement).
            var color = (obj["color"]?.ToString() ?? string.Empty).Trim();
            if (!string.IsNullOrWhiteSpace(color))
            {
                var u = color.ToUpperInvariant();
                if (u is "ZWART" or "WIT" or "GRIJS" or "ROOD" or "BLAUW" or "GROEN" or "GEEL" or "ROZE" or "PAARS" or "ZILVER" or "GOUD")
                {
                    return true;
                }
            }

            return false;
        }

        // RAM: backfill core kit fields
        if (category == 2)
        {
            static bool NameSaysDdr(string? name, out int ddrType)
            {
                ddrType = 0;
                if (string.IsNullOrWhiteSpace(name)) return false;
                if (name.Contains("DDR5", StringComparison.OrdinalIgnoreCase)) { ddrType = 1; return true; }
                if (name.Contains("DDR4", StringComparison.OrdinalIgnoreCase)) { ddrType = 0; return true; }
                return false;
            }

            var speed = 0;
            _ = int.TryParse(obj["speedMHz"]?.ToString(), out speed);
            var cap = 0;
            _ = int.TryParse(obj["capacityGB"]?.ToString(), out cap);
            var modules = 0;
            _ = int.TryParse(obj["moduleCount"]?.ToString(), out modules);
            var cl = 0;
            _ = int.TryParse(obj["cASLatency"]?.ToString(), out cl);
            var type = 0;
            _ = int.TryParse(obj["type"]?.ToString(), out type);
            var name = obj["name"]?.ToString();

            if (NameSaysDdr(name, out var expected) && expected != type)
            {
                return true;
            }

            return speed <= 0 || cap <= 0 || modules <= 0 || cl <= 0;
        }

        // GPU: length/slots/memory are used in UI badges and compatibility.
        if (category == 3)
        {
            var length = 0;
            _ = int.TryParse(obj["length"]?.ToString(), out length);
            var slots = 0;
            _ = int.TryParse(obj["slots"]?.ToString(), out slots);
            var mem = 0;
            _ = int.TryParse(obj["memoryGB"]?.ToString(), out mem);
            var core = 0;
            _ = int.TryParse(obj["coreClock"]?.ToString(), out core);
            var boost = 0;
            _ = int.TryParse(obj["boostClock"]?.ToString(), out boost);
            var chipset = (obj["chipset"]?.ToString() ?? string.Empty).Trim();
            return length <= 0 || slots <= 0 || mem <= 0 || core <= 0 || boost <= 0 || string.IsNullOrWhiteSpace(chipset);
        }

        // PSU: efficiency is used in UI badges.
        if (category == 5)
        {
            var eff = (obj["efficiency"]?.ToString() ?? string.Empty).Trim();
            var watts = 0;
            _ = int.TryParse(obj["wattageRating"]?.ToString(), out watts);
            return string.IsNullOrWhiteSpace(eff) || watts <= 0;
        }

        // Cooler: radiator size (AIO) and height (air) are key fields.
        if (category == 7)
        {
            var type = (obj["coolerType"]?.ToString() ?? string.Empty).Trim();
            var height = 0;
            _ = int.TryParse(obj["heightMM"]?.ToString(), out height);
            var watts = 0;
            _ = int.TryParse(obj["wattage"]?.ToString(), out watts);

            // radiatorSizeMM is nullable in API model
            var radRaw = obj["radiatorSizeMM"]?.ToString();
            var rad = 0;
            _ = int.TryParse(radRaw, out rad);

            if (string.IsNullOrWhiteSpace(type)) return true;
            if (type.Equals("AIO", StringComparison.OrdinalIgnoreCase)) return rad <= 0 || watts <= 0;
            return height <= 0 || watts <= 0;
        }

        // Motherboard: ensure core connectivity fields are present.
        if (category == 1)
        {
            static bool NameSaysDdr(string? name, out int ddrType)
            {
                ddrType = 0;
                if (string.IsNullOrWhiteSpace(name)) return false;
                if (name.Contains("DDR5", StringComparison.OrdinalIgnoreCase)) { ddrType = 1; return true; }
                if (name.Contains("DDR4", StringComparison.OrdinalIgnoreCase)) { ddrType = 0; return true; }
                return false;
            }

            var slots = 0;
            _ = int.TryParse(obj["memorySlots"]?.ToString(), out slots);
            var max = 0;
            _ = int.TryParse(obj["maxMemoryGB"]?.ToString(), out max);
            var pcie = 0;
            _ = int.TryParse(obj["pCIeSlots"]?.ToString(), out pcie);
            var m2 = 0;
            _ = int.TryParse(obj["m2Slots"]?.ToString(), out m2);
            var sata = 0;
            _ = int.TryParse(obj["sataSlots"]?.ToString(), out sata);
            var memType = 0;
            _ = int.TryParse(obj["memoryType"]?.ToString(), out memType);
            var name = obj["name"]?.ToString();

            if (NameSaysDdr(name, out var expected) && expected != memType)
            {
                return true;
            }

            return slots <= 0 || max <= 0 || pcie <= 0 || m2 <= 0 || sata <= 0;
        }

        return false;
    }
}
