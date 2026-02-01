using System.Globalization;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using PCPartScraper.Models;

namespace PCPartScraper.Services;

public static class PartSpecMapper
{
    public static bool ApplySpecsToPartJson(int category, JsonNode json, ProductScrapeResult scrape)
    {
        if (json is not JsonObject obj) return false;
        if (scrape.Specs is null || scrape.Specs.Count == 0) return false;

        var changed = false;

        changed |= category switch
        {
            0 => ApplyCpu(obj, scrape),
            1 => ApplyMotherboard(obj, scrape),
            2 => ApplyRam(obj, scrape),
            3 => ApplyGpu(obj, scrape),
            4 => ApplyStorage(obj, scrape),
            5 => ApplyPsu(obj, scrape),
            6 => ApplyCase(obj, scrape),
            7 => ApplyCooler(obj, scrape),
            _ => false
        };

        return changed;
    }

    public static bool ApplyRepairSpecsToPartJson(int category, JsonNode json, ProductScrapeResult scrape)
    {
        if (json is not JsonObject obj) return false;

        var changed = false;

        // Clear meaningless existing wattage values (do this even if scraping fails).
        if (obj.TryGetPropertyValue("wattage", out var wattageNode))
        {
            var raw = wattageNode?.ToString();
            if (int.TryParse(raw, out var w) && w <= 0)
            {
                obj.Remove("wattage");
                changed = true;
            }
        }

        // Only these categories should store Part.wattage: CPU, GPU, Storage, Cooler.
        if (category is not (0 or 3 or 4 or 7))
        {
            if (obj.ContainsKey("wattage"))
            {
                obj.Remove("wattage");
                changed = true;
            }
        }

        if (scrape.Specs is null || scrape.Specs.Count == 0) return changed;

        changed |= ApplySpecsToPartJson(category, json, scrape);

        // Case: normalize Dutch colors to English (repair can overwrite Dutch values).
        if (category == 6 && TryGetSpec(scrape.Specs, out var caseColorRaw, "Kleur"))
        {
            var normalized = NormalizeColorEnglish(caseColorRaw);
            var current = obj["color"]?.ToString() ?? string.Empty;

            if (IsLikelyDutchColor(current) && !string.IsNullOrWhiteSpace(normalized)
                && !string.Equals(current, normalized, StringComparison.OrdinalIgnoreCase))
            {
                obj["color"] = normalized;
                changed = true;
            }
        }

        // Storage: allow overwriting capacity when it looks like the historical TB->GB bug.
        if (category == 4 && TryParseStorageCapacityGB(scrape.Specs, out var capGb) && capGb > 0)
        {
            var currentRaw = obj["capacityGB"]?.ToString();
            _ = int.TryParse(currentRaw, out var current);

            // Only overwrite if missing/zero, or if existing is implausibly small and the scraped value is reasonable.
            if (current <= 0 || (current < 64 && capGb >= 128))
            {
                if (current != capGb)
                {
                    obj["capacityGB"] = capGb;
                    changed = true;
                }
            }
        }

        return changed;
    }

    public static JsonObject BuildCreateBody(int category, ProductScrapeResult scrape)
    {
        var body = new JsonObject
        {
            ["name"] = scrape.Name ?? scrape.Query,
            ["manufacturer"] = scrape.Manufacturer ?? string.Empty,
            ["price"] = scrape.Price ?? 0m,
            ["imageUrl"] = scrape.ImageUrl,
            ["productUrl"] = scrape.ProductUrl,
        };

        _ = category switch
        {
            0 => ApplyCpu(body, scrape),
            1 => ApplyMotherboard(body, scrape),
            2 => ApplyRam(body, scrape),
            3 => ApplyGpu(body, scrape),
            4 => ApplyStorage(body, scrape),
            5 => ApplyPsu(body, scrape),
            6 => ApplyCase(body, scrape),
            7 => ApplyCooler(body, scrape),
            _ => false
        };

        return body;
    }

    private static bool ApplyCpu(JsonObject obj, ProductScrapeResult scrape)
    {
        var changed = false;

        if (TryParseSocket(scrape.Specs, out var socket))
        {
            changed |= SetIfMissingOrDifferentIntAllowZero(obj, "socket", socket);
        }

        if (TryParseInt(scrape.Specs, out var cores, "Aantal cores", "Cores", "Kernen", "Aantal kernen"))
        {
            changed |= SetIfMissingInt(obj, "coreCount", cores);
        }
        else if (TryParseCpuCoreCountFromAantal(scrape.Specs, out var coresFromAantal))
        {
            changed |= SetIfMissingInt(obj, "coreCount", coresFromAantal);
        }

        if (TryParseInt(scrape.Specs, out var threads, "Aantal threads", "Threads"))
        {
            changed |= SetIfMissingInt(obj, "threadCount", threads);
        }

        if (TryParseCpuClockGHz(scrape.Specs, out var baseGHz, "Basiskloksnelheid", "Base clock", "Kloksnelheid"))
        {
            changed |= SetIfMissingDecimal(obj, "baseClock", baseGHz);
        }

        if (TryParseCpuClockGHz(scrape.Specs, out var boostGHz,
                "Turbo kloksnelheid",
                "Turbosnelheid",
                "Boost clock",
                "Boostklok",
                "Boost kloksnelheid",
                "Boostkloksnelheid",
                "Max. turbo",
                "Max turbo",
                "Maximale turbosnelheid",
                "Maximale turbo kloksnelheid",
                "Maximale turbokloksnelheid",
                "Max. kloksnelheid",
                "Maximum kloksnelheid",
                "Turbo-modus Tot maximaal",
                "Turbo-modus"))
        {
            changed |= SetIfMissingDecimal(obj, "boostClock", boostGHz);
        }
        else
        {
            // Fallback: many Alternate titles include boost like "(4,7 GHz Turbo Boost)".
            var title = scrape.Name ?? string.Empty;
            var m = Regex.Match(title, "(\\d{1,2}(?:[\\.,]\\d{1,2})?)\\s*GHz[^)]*(?:TURBO|BOOST)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
            if (m.Success)
            {
                var s = m.Groups[1].Value.Replace(',', '.');
                if (decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out var ghz) && ghz > 0)
                {
                    changed |= SetIfMissingDecimal(obj, "boostClock", ghz);
                }
            }
        }

        // CPU wattage (TDP/base power). Store in Part.Wattage.
        if (TryParseIntWithUnit(scrape.Specs, out var cpuWatts, "W",
                "TDP",
            "Stroomverbruik (TDP)",
            "Stroomverbruik",
                "Thermal Design Power",
                "Thermisch ontwerpvermogen",
                "Thermisch ontwerpvermogen (TDP)",
                "Processor base power",
                "Basisvermogen",
                "Base power",
            "Vermogen (TDP)",
                "Vermogen"))
        {
            changed |= SetIfMissingInt(obj, "wattage", cpuWatts);
        }

        if (TryParseBool(scrape.Specs, out var igpu,
                "Geïntegreerde grafische kaart",
                "Geintegreerde grafische kaart",
                "Integrated graphics"))
        {
            if (igpu) changed |= SetIfMissingBool(obj, "integratedGraphics", true);
        }

        return changed;
    }

    private static bool ApplyMotherboard(JsonObject obj, ProductScrapeResult scrape)
    {
        var changed = false;

        if (TryParseSocket(scrape.Specs, out var socket))
        {
            changed |= SetIfMissingOrDifferentIntAllowZero(obj, "socket", socket);
        }

        if (TryGetSpec(scrape.Specs, out var chipset, "Chipset"))
        {
            changed |= SetIfMissingString(obj, "chipset", chipset);
        }

        if (TryParseFormFactor(scrape.Specs, out var ff))
        {
            changed |= SetIfMissingOrDifferentIntAllowZero(obj, "formFactor", ff);
        }

        if (TryParseRamType(scrape.Specs, out var ramType))
        {
            changed |= SetIfMissingOrDifferentIntAllowZero(obj, "memoryType", ramType);
        }

        if (TryParseInt(scrape.Specs, out var slots, "Geheugenslots", "Aantal geheugensleuven", "Geheugensleuven", "Memory slots"))
        {
            changed |= SetIfMissingInt(obj, "memorySlots", slots);
        }

        if (!int.TryParse(obj["memorySlots"]?.ToString(), out var existingMemSlots) || existingMemSlots <= 0)
        {
            if (TryParseInt(scrape.Specs, out var slots2,
                    "Geheugenslot",
                    "Aantal geheugenslots",
                    "Aantal DIMM-sloten",
                    "DIMM-sloten",
                    "DIMM slots",
                    "DIMM slot"))
            {
                changed |= SetIfMissingInt(obj, "memorySlots", slots2);
            }
            else
            {
                // Fallback: scan any memory-related rows and take the first plausible slot count.
                foreach (var kv in scrape.Specs)
                {
                    if (!kv.Key.Contains("Geheugen", StringComparison.OrdinalIgnoreCase)
                        && !kv.Key.Contains("Memory", StringComparison.OrdinalIgnoreCase)
                        && !kv.Key.Contains("DIMM", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (int.TryParse(ExtractFirstInt(kv.Value), out var s) && s is > 0 and <= 16)
                    {
                        obj["memorySlots"] = s;
                        changed = true;
                        break;
                    }
                }
            }
        }

        if (TryParseIntWithUnit(scrape.Specs, out var maxGb, "GB",
                "Max. geheugen",
                "Max geheugen",
                "Maximum geheugen",
                "Max Memory",
                "Maximaal geheugen",
                "Maximale geheugencapaciteit",
                "Maximale geheugencapaciteit (RAM)",
                "Maximum memory"))
        {
            changed |= SetIfMissingInt(obj, "maxMemoryGB", maxGb);
        }
        else
        {
            // Fallback: sometimes max memory is embedded in a longer memory-related value.
            var best = 0;
            foreach (var kv in scrape.Specs)
            {
                if (!kv.Key.Contains("Geheugen", StringComparison.OrdinalIgnoreCase)
                    && !kv.Key.Contains("Memory", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (!kv.Key.Contains("Max", StringComparison.OrdinalIgnoreCase)
                    && !kv.Value.Contains("Max", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (TryParseCapacityFromText(kv.Value, out var gb) && gb > best)
                {
                    best = gb;
                }
            }

            if (best > 0)
            {
                changed |= SetIfMissingInt(obj, "maxMemoryGB", best);
            }
        }

        if (TryParseInt(scrape.Specs, out var pcie, "PCIe slots", "PCI-Express slots", "PCI Express slots", "Inbouwsloten PCIe x16", "Inbouwsloten"))
        {
            changed |= SetIfMissingInt(obj, "pCIeSlots", pcie);
        }

        if (TryParseInt(scrape.Specs, out var m2, "M.2 slots", "M2 slots", "M.2"))
        {
            changed |= SetIfMissingInt(obj, "m2Slots", m2);
        }

        if (TryParseInt(scrape.Specs, out var sata, "SATA", "SATA-poorten", "Sata slots", "SATA connectors"))
        {
            changed |= SetIfMissingInt(obj, "sataSlots", sata);
        }

        return changed;
    }

    private static bool ApplyRam(JsonObject obj, ProductScrapeResult scrape)
    {
        var changed = false;

        if (TryParseRamType(scrape.Specs, out var ramType))
        {
            changed |= SetIfMissingOrDifferentIntAllowZero(obj, "type", ramType);
        }

        if (TryParseRamSpeedMHz(scrape.Specs, out var mhz))
        {
            changed |= SetIfMissingInt(obj, "speedMHz", mhz);
        }

        if (TryParseStorageCapacityGB(scrape.Specs, out var capGb))
        {
            // Some RAM pages show capacity as "32 GB" without a RAM-specific key.
            changed |= SetIfMissingInt(obj, "capacityGB", capGb);
        }

        if (TryParseModuleCountAndCapacity(scrape.Specs, out var modules, out var kitGb))
        {
            changed |= SetIfMissingInt(obj, "moduleCount", modules);
            changed |= SetIfMissingInt(obj, "capacityGB", kitGb);
        }

        if (TryParseInt(scrape.Specs, out var moduleCount, "Module", "Modules"))
        {
            changed |= SetIfMissingInt(obj, "moduleCount", moduleCount);
        }

        if (TryParseCasLatency(scrape.Specs, out var cl))
        {
            changed |= SetIfMissingInt(obj, "cASLatency", cl);
        }

        return changed;
    }

    private static bool ApplyGpu(JsonObject obj, ProductScrapeResult scrape)
    {
        var changed = false;

        if (TryGetSpec(scrape.Specs, out var chip, "Grafische chip", "GPU"))
        {
            changed |= SetIfMissingString(obj, "chipset", chip);
        }

        if (TryParseIntWithUnit(scrape.Specs, out var memGb, "GB", "Geheugen"))
        {
            changed |= SetIfMissingInt(obj, "memoryGB", memGb);
        }

        if (TryGetSpec(scrape.Specs, out var memType, "Geheugen", "Memory"))
        {
            var m = Regex.Match(memType, "GDDR\\s*[0-9]+X?", RegexOptions.IgnoreCase);
            if (m.Success)
            {
                changed |= SetIfMissingString(obj, "memoryType", m.Value.Replace(" ", string.Empty, StringComparison.OrdinalIgnoreCase));
            }
        }

        if (TryParseIntWithUnit(scrape.Specs, out var coreMhz, "MHz",
                "GPU-snelheid",
                "GPU snelheid",
                "GPU kloksnelheid",
                "Grafische kloksnelheid",
                "Kernklok",
            "Kernsnelheid",
            "Basisklok",
            "Basiskloksnelheid",
            "Base clock",
                "Core clock",
                "Core klok",
                "GPU clock",
                "Kloksnelheid"))
        {
            changed |= SetIfMissingInt(obj, "coreClock", coreMhz);
        }

        if (TryParseIntWithUnit(scrape.Specs, out var boostMhz, "MHz",
                "Boost clock",
                "Boostklok",
                "Boost kloksnelheid",
                "Boostkloksnelheid",
            "Turbo",
                "Boost",
                "GPU boost",
                "Max. boost",
                "Maximale boost",
                "Maximale boostkloksnelheid"))
        {
            changed |= SetIfMissingInt(obj, "boostClock", boostMhz);
        }

        if (TryParseGpuLengthMM(scrape.Specs, out var lengthMm))
        {
            changed |= SetIfMissingInt(obj, "length", lengthMm);
        }

        if (TryParseSlots(scrape.Specs, out var slots))
        {
            changed |= SetIfMissingInt(obj, "slots", slots);
        }

        // GPU power draw / TGP / board power. Store in Part.Wattage.
        if (TryParseIntWithUnit(scrape.Specs, out var gpuWatts, "W",
                "Stroomverbruik",
                "Vermogensverbruik",
                "Energieverbruik",
                "Power consumption",
                "Board power",
                "TGP",
                "TDP",
                "Vermogen"))
        {
            changed |= SetIfMissingInt(obj, "wattage", gpuWatts);
        }

        return changed;
    }

    private static bool ApplyStorage(JsonObject obj, ProductScrapeResult scrape)
    {
        var changed = false;

        if (TryGetSpec(scrape.Specs, out var type, "Type", "Soort"))
        {
            var normalized = type;
            if (type.Contains("NVMe", StringComparison.OrdinalIgnoreCase)) normalized = "NVMe";
            else if (type.Contains("SSD", StringComparison.OrdinalIgnoreCase)) normalized = "SSD";
            else if (type.Contains("HDD", StringComparison.OrdinalIgnoreCase) || type.Contains("Harddisk", StringComparison.OrdinalIgnoreCase)) normalized = "HDD";
            changed |= SetIfMissingString(obj, "type", normalized);
        }

        if (TryParseStorageCapacityGB(scrape.Specs, out var capGb))
        {
            changed |= SetIfMissingInt(obj, "capacityGB", capGb);
        }

        if (TryGetSpec(scrape.Specs, out var iface, "Interface", "Aansluiting", "Protocol"))
        {
            changed |= SetIfMissingString(obj, "interface", iface);
        }

        if (TryParseIntWithUnit(scrape.Specs, out var read, "MB/s", "Leessnelheid", "Overdrachtssnelheid Lezen", "Read"))
        {
            changed |= SetIfMissingInt(obj, "readSpeedMBps", read);
        }

        if (TryParseIntWithUnit(scrape.Specs, out var write, "MB/s", "Schrijfsnelheid", "Overdrachtssnelheid Schrijven", "Write"))
        {
            changed |= SetIfMissingInt(obj, "writeSpeedMBps", write);
        }

        // Storage power usage. Alternate often provides a decimal value like "6,2 W".
        // We only store meaningful W values (avoid idle mW rounding to 0).
        if (TryParseDecimalWithUnit(scrape.Specs, out var storageWatts, "W",
                "Stroomverbruik Gebruik",
                "Stroomverbruik gebruik",
                "Stroomverbruik actief",
                "Power consumption active",
                "Power consumption"))
        {
            if (storageWatts >= 1m)
            {
                var rounded = (int)Math.Round(storageWatts, 0, MidpointRounding.AwayFromZero);
                if (rounded <= 0) rounded = 1;
                changed |= SetIfMissingInt(obj, "wattage", rounded);
            }
        }

        return changed;
    }

    private static bool ApplyPsu(JsonObject obj, ProductScrapeResult scrape)
    {
        var changed = false;

        if (TryParseIntWithUnit(scrape.Specs, out var watts, "W", "Vermogen Gezamenlijk", "Gezamenlijk vermogen", "Vermogen"))
        {
            changed |= SetIfMissingInt(obj, "wattageRating", watts);
        }

        if (TryParsePsuEfficiency(scrape.Specs, out var efficiency))
        {
            changed |= SetIfMissingString(obj, "efficiency", efficiency);
        }

        if (TryParseBool(scrape.Specs, out var modular, "Kabel Modulair", "Modulair", "Modular"))
        {
            if (modular) changed |= SetIfMissingBool(obj, "modular", true);
        }

        if (TryParseFormFactor(scrape.Specs, out var ff))
        {
            changed |= SetIfMissingOrDifferentIntAllowZero(obj, "formFactor", ff);
        }

        return changed;
    }

    private static bool ApplyCase(JsonObject obj, ProductScrapeResult scrape)
    {
        var changed = false;

        if (TryParseFormFactor(scrape.Specs, out var ff))
        {
            changed |= SetIfMissingOrDifferentIntAllowZero(obj, "formFactor", ff);
        }

        if (TryGetSpec(scrape.Specs, out var color, "Kleur"))
        {
            changed |= SetIfMissingString(obj, "color", NormalizeColorEnglish(color));
        }

        if (TryParseIntWithUnit(scrape.Specs, out var gpuLen, "mm",
                "Max. GPU lengte",
                "Max GPU lengte",
                "Maximale GPU lengte",
                "GPU lengte",
                "Lengte grafische kaart",
                "Lengte grafische kaart maximaal",
                "Interne afmetingen Lengte grafische kaart",
                "Interne afmetingen Lengte grafische kaart maximaal"))
        {
            changed |= SetIfMissingInt(obj, "maxGPULength", gpuLen);
        }

        if (TryParseBool(scrape.Specs, out var sidePanel, "Window", "Zijpaneel", "Tempered Glass"))
        {
            if (sidePanel) changed |= SetIfMissingBool(obj, "hasSidePanel", true);
        }
        else
        {
            if ((scrape.Name ?? string.Empty).Contains("Tempered Glass", StringComparison.OrdinalIgnoreCase))
            {
                changed |= SetIfMissingBool(obj, "hasSidePanel", true);
            }
        }

        return changed;
    }

    private static bool ApplyCooler(JsonObject obj, ProductScrapeResult scrape)
    {
        var changed = false;

        if (TryParseCoolerSocket(scrape.Specs, out var socket))
        {
            changed |= SetIfMissingOrDifferentIntAllowZero(obj, "socket", socket);
        }

        var coolerType = InferCoolerType(scrape);
        if (!string.IsNullOrWhiteSpace(coolerType))
        {
            changed |= SetIfMissingOrDifferentString(obj, "coolerType", coolerType);
        }

        // Cooler height is essential for case compatibility.
        if (TryParseIntWithUnit(scrape.Specs, out var height, "mm",
                "Hoogte",
                "Totale hoogte",
                "Hoogte koeler",
                "Hoogte koelblok",
                "Hoogte koellichaam",
                "Height"))
        {
            // Prefer correcting upward if we previously captured a smaller sub-part height.
            var currentRaw = obj["heightMM"]?.ToString();
            _ = int.TryParse(currentRaw, out var current);
            if (current <= 0 || height > current)
            {
                obj["heightMM"] = height;
                changed = true;
            }
        }
        else
        {
            // Alternate often encodes height inside dimension rows like:
            // "Afmeting (BxHxD) Totaal" => "Breedte: 100 mm x Hoogte: 136 mm x Diepte: 75 mm"
            static bool TryExtractHeightFromDims(string dims, out int h)
            {
                h = 0;
                if (string.IsNullOrWhiteSpace(dims)) return false;

                var m = Regex.Match(dims, "(?:Hoogte|Height)\\s*:?\\s*(\\d{2,4})\\s*mm", RegexOptions.IgnoreCase);
                if (!m.Success) m = Regex.Match(dims, "(\\d{2,4})\\s*mm\\s*\\(H\\)", RegexOptions.IgnoreCase);
                if (!m.Success) m = Regex.Match(dims, "\\bH:?\\s*(\\d{2,4})\\s*mm", RegexOptions.IgnoreCase);
                if (!m.Success)
                {
                    // Unlabeled BxHxD patterns: "100 x 136 x 75 mm" => height is middle.
                    var m2 = Regex.Match(dims, "(\\d{2,4})\\s*[x×]\\s*(\\d{2,4})\\s*[x×]\\s*(\\d{2,4})\\s*mm", RegexOptions.IgnoreCase);
                    if (m2.Success && int.TryParse(m2.Groups[2].Value, out var mid) && mid > 0)
                    {
                        h = mid;
                        return true;
                    }
                }
                return m.Success && int.TryParse(m.Groups[1].Value, out h) && h > 0;
            }

            var bestTotalHeight = 0;
            foreach (var kv in scrape.Specs)
            {
                if (!kv.Key.Contains("Afmet", StringComparison.OrdinalIgnoreCase)) continue;
                if (!kv.Key.Contains("Totaal", StringComparison.OrdinalIgnoreCase)
                    && !kv.Key.Contains("Total", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (TryExtractHeightFromDims(kv.Value, out var h) && h > bestTotalHeight)
                {
                    bestTotalHeight = h;
                }
            }

            var bestAnyHeight = 0;
            if (bestTotalHeight <= 0)
            {
                foreach (var kv in scrape.Specs)
                {
                    if (!kv.Key.Contains("Afmet", StringComparison.OrdinalIgnoreCase)) continue;
                    if (TryExtractHeightFromDims(kv.Value, out var h) && h > bestAnyHeight)
                    {
                        bestAnyHeight = h;
                    }
                }
            }

            var resolved = bestTotalHeight > 0 ? bestTotalHeight : bestAnyHeight;
            if (resolved > 0)
            {
                var currentRaw = obj["heightMM"]?.ToString();
                _ = int.TryParse(currentRaw, out var current);
                if (current <= 0 || resolved > current)
                {
                    obj["heightMM"] = resolved;
                    changed = true;
                }
            }
        }

        if (TryParseRadiatorSize(scrape.Specs, out var rad))
        {
            changed |= SetIfMissingInt(obj, "radiatorSizeMM", rad);
        }
        else if (string.Equals(coolerType, "AIO", StringComparison.OrdinalIgnoreCase)
                 && TryParseRadiatorSizeFromFan(scrape.Specs, out rad))
        {
            changed |= SetIfMissingInt(obj, "radiatorSizeMM", rad);
        }

        // Cooler wattage: Alternate is inconsistent. Sometimes this is electrical power draw, sometimes it's rated cooling/TDP.
        // Prefer electrical power draw when present.
        if (TryParseIntWithUnit(scrape.Specs, out var coolerWatts, "W",
                "Stroomverbruik",
                "Power consumption",
                "Vermogen"))
        {
            changed |= SetIfMissingInt(obj, "wattage", coolerWatts);
        }
        else if (TryParseIntWithUnit(scrape.Specs, out coolerWatts, "W",
                "TDP",
                "Max. TDP",
                "Koelvermogen",
                "Koelcapaciteit",
                "Cooling capacity",
                "Heat dissipation"))
        {
            changed |= SetIfMissingInt(obj, "wattage", coolerWatts);
        }

        return changed;
    }

    private static bool TryParseCpuCoreCountFromAantal(Dictionary<string, string> specs, out int cores)
    {
        cores = 0;
        if (!TryGetSpec(specs, out var v, "Aantal")) return false;
        var m = Regex.Match(v, "(\\d{1,2})\\s*(?:cores|kernen)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        return m.Success && int.TryParse(m.Groups[1].Value, out cores) && cores > 0;
    }

    private static bool TryParseCpuClockGHz(Dictionary<string, string> specs, out decimal ghz, params string[] keys)
    {
        ghz = 0m;
        if (!TryGetSpec(specs, out var v, keys)) return false;

        var m = Regex.Match(v, "(\\d{1,5}(?:[.,]\\d{1,2})?)", RegexOptions.CultureInvariant);
        if (!m.Success) return false;

        var numberText = m.Groups[1].Value.Replace(',', '.');
        if (!decimal.TryParse(numberText, NumberStyles.Number, CultureInfo.InvariantCulture, out var n) || n <= 0) return false;

        var u = v.ToUpperInvariant();

        if (u.Contains("MHZ", StringComparison.OrdinalIgnoreCase) || n >= 100m)
        {
            ghz = Math.Round(n / 1000m, 2, MidpointRounding.AwayFromZero);
            return ghz > 0;
        }

        // Sometimes shown as "42" / "47" (meaning 4.2 / 4.7 GHz) without explicit units.
        if (!u.Contains("GHZ", StringComparison.OrdinalIgnoreCase)
            && !u.Contains("MHZ", StringComparison.OrdinalIgnoreCase)
            && n is >= 20m and <= 60m
            && decimal.Truncate(n) == n)
        {
            ghz = Math.Round(n / 10m, 2, MidpointRounding.AwayFromZero);
            return ghz > 0;
        }

        ghz = n;
        return ghz > 0;
    }

    private static bool TryParseGpuLengthMM(Dictionary<string, string> specs, out int lengthMm)
    {
        lengthMm = 0;

        // Some pages show decimal mm values like "357,6 mm".
        if (TryParseDecimalWithUnit(specs, out var lengthDec, "mm",
                "Lengte",
                "Kaartlengte",
                "Kaart lengte",
                "Afmetingen Lengte",
                "Lengte (mm)")
            && lengthDec > 0)
        {
            lengthMm = (int)Math.Round(lengthDec, 0, MidpointRounding.AwayFromZero);
            return lengthMm > 0;
        }

        if (TryParseIntWithUnit(specs, out lengthMm, "mm",
                "Lengte",
                "Kaartlengte",
                "Kaart lengte",
                "Afmetingen Lengte",
                "Lengte (mm)"))
        {
            return lengthMm > 0;
        }

        if (TryGetSpec(specs, out var dims, "Afmetingen", "Dimensions", "Dimensies"))
        {
            // Prefer labeled dimensions like:
            // "Breedte: 149,3 mm x Hoogte: 76 mm x Diepte/lengte: 357,6 mm"
            var m = Regex.Match(dims, "DIEPTE\\s*/\\s*LENGTE:?\\s*(\\d{2,4}(?:[\\.,]\\d{1,2})?)\\s*MM", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
            if (m.Success)
            {
                var raw = m.Groups[1].Value.Replace(',', '.');
                if (decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var lDec) && lDec > 0)
                {
                    lengthMm = (int)Math.Round(lDec, 0, MidpointRounding.AwayFromZero);
                    return lengthMm > 0;
                }
            }

            m = Regex.Match(dims, "LENGTE:?\\s*(\\d{2,4}(?:[\\.,]\\d{1,2})?)\\s*MM", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
            if (m.Success)
            {
                var raw = m.Groups[1].Value.Replace(',', '.');
                if (decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var lDec) && lDec > 0)
                {
                    lengthMm = (int)Math.Round(lDec, 0, MidpointRounding.AwayFromZero);
                    return lengthMm > 0;
                }
            }

            // Unlabeled format: "280 x 120 x 45 mm" (assume first is length).
            m = Regex.Match(dims, "(\\d{2,4}(?:[\\.,]\\d{1,2})?)\\s*(?:mm)?\\s*[x×]\\s*(\\d{2,4}(?:[\\.,]\\d{1,2})?)\\s*(?:mm)?\\s*[x×]\\s*(\\d{2,4}(?:[\\.,]\\d{1,2})?)\\s*(?:mm)?", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
            if (m.Success)
            {
                var raw = m.Groups[1].Value.Replace(',', '.');
                if (decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var lDec) && lDec > 0)
                {
                    lengthMm = (int)Math.Round(lDec, 0, MidpointRounding.AwayFromZero);
                    return lengthMm > 0;
                }
            }
        }

        return false;
    }

    private static bool TryParseSlots(Dictionary<string, string> specs, out int slots)
    {
        slots = 0;
        if (!TryGetSpec(specs, out var v,
                "Bezette sloten",
                "Bezette slots",
                "Slotbreedte",
                "Slot width",
                "Slots"))
        {
            return false;
        }

        var m = Regex.Match(v, "(\\d)(?:[.,](\\d))?", RegexOptions.CultureInvariant);
        if (!m.Success) return false;
        if (!int.TryParse(m.Groups[1].Value, out var whole)) return false;

        var half = 0;
        if (m.Groups[2].Success && int.TryParse(m.Groups[2].Value, out var dec) && dec >= 5) half = 1;

        slots = whole + half;
        return slots > 0;
    }

    private static bool TryParseRamSpeedMHz(Dictionary<string, string> specs, out int speedMHz)
    {
        speedMHz = 0;

        // Prefer marketed speed like "DDR5-5600" from "Standaard".
        if (TryGetSpec(specs, out var standard, "Standaard", "Standard"))
        {
            var m = Regex.Match(standard, "DDR\\s*[45]\\s*[- ]\\s*(\\d{3,5})", RegexOptions.IgnoreCase);
            if (m.Success && int.TryParse(m.Groups[1].Value, out speedMHz) && speedMHz > 0) return true;

            if (int.TryParse(ExtractFirstInt(standard), out speedMHz) && speedMHz >= 800) return true;
        }

        // Fallback: physical clock like "2800 MHz" => effective 5600
        if (TryParseIntWithUnit(specs, out var physical, "MHz", "Fysieke kloksnelheid"))
        {
            speedMHz = physical * 2;
            return speedMHz > 0;
        }

        if (TryParseIntWithUnit(specs, out speedMHz, "MHz", "Snelheid", "Kloksnelheid", "Geheugensnelheid"))
        {
            return speedMHz > 0;
        }

        return false;
    }

    private static bool TryParseModuleCountAndCapacity(Dictionary<string, string> specs, out int moduleCount, out int capacityGb)
    {
        moduleCount = 0;
        capacityGb = 0;

        foreach (var v in specs.Values)
        {
            var m = Regex.Match(v, "(\\d)\\s*x\\s*(\\d{1,3})\\s*GB", RegexOptions.IgnoreCase);
            if (m.Success && int.TryParse(m.Groups[1].Value, out var mc) && int.TryParse(m.Groups[2].Value, out var per))
            {
                moduleCount = mc;
                capacityGb = mc * per;
                return true;
            }
        }

        return false;
    }

    private static bool TryParseCasLatency(Dictionary<string, string> specs, out int cl)
    {
        cl = 0;

        if (TryGetSpec(specs, out var v, "CAS latency", "CAS", "CL"))
        {
            var m = Regex.Match(v, "CL\\s*(\\d{1,2})", RegexOptions.IgnoreCase);
            if (m.Success && int.TryParse(m.Groups[1].Value, out cl) && cl > 0) return true;

            if (int.TryParse(ExtractFirstInt(v), out cl) && cl > 0) return true;
        }

        foreach (var v2 in specs.Values)
        {
            var m = Regex.Match(v2 ?? string.Empty, "\\bCL\\s*(\\d{1,2})\\b", RegexOptions.IgnoreCase);
            if (m.Success && int.TryParse(m.Groups[1].Value, out cl) && cl > 0) return true;
        }

        return false;
    }

    private static bool TryParseStorageCapacityGB(Dictionary<string, string> specs, out int capacityGb)
    {
        capacityGb = 0;

        // Try some typical keys first.
        if (TryGetSpec(specs, out var v, "Capaciteit", "Geheugengrootte", "Opslag", "Geheugen", "Capacity"))
        {
            if (TryParseCapacityFromText(v, out capacityGb)) return true;
        }

        // Fallback: scan values.
        foreach (var val in specs.Values)
        {
            if (TryParseCapacityFromText(val, out capacityGb)) return true;
        }

        return false;
    }

    private static bool TryParseCapacityFromText(string text, out int capacityGb)
    {
        capacityGb = 0;
        if (string.IsNullOrWhiteSpace(text)) return false;

        var m = Regex.Match(text, "(\\d{1,5}(?:[.,]\\d{1,2})?)\\s*(TB|GB)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        if (!m.Success) return false;

        var numberText = m.Groups[1].Value.Replace(',', '.');
        if (!decimal.TryParse(numberText, NumberStyles.Number, CultureInfo.InvariantCulture, out var n) || n <= 0) return false;

        var unit = m.Groups[2].Value.ToUpperInvariant();
        var gb = unit == "TB" ? n * 1024m : n;
        if (gb <= 0) return false;

        capacityGb = (int)Math.Round(gb, MidpointRounding.AwayFromZero);
        return capacityGb > 0;
    }

    private static bool TryParsePsuEfficiency(Dictionary<string, string> specs, out string efficiency)
    {
        efficiency = string.Empty;

        if (TryGetSpec(specs, out var raw,
                "Certificering",
                "Efficiëntie",
                "Efficientie",
                "80 PLUS",
                "80-PLUS",
                "80Plus",
                "80PLUS",
                "Cybernetics",
                "Cybenetics"))
        {
            efficiency = NormalizeEfficiencyEnglish(raw);
            return !string.IsNullOrWhiteSpace(efficiency);
        }

        foreach (var v in specs.Values)
        {
            if (string.IsNullOrWhiteSpace(v)) continue;
            var u = v.ToUpperInvariant();
            if (u.Contains("80", StringComparison.OrdinalIgnoreCase) && u.Contains("PLUS", StringComparison.OrdinalIgnoreCase))
            {
                efficiency = NormalizeEfficiencyEnglish(v);
                return !string.IsNullOrWhiteSpace(efficiency);
            }
        }

        return false;
    }

    private static string NormalizeEfficiencyEnglish(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

        var v = raw.Trim();
        v = v.Replace("80 PLUS", "80+", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("80Plus", "80+", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("80-PLUS", "80+", StringComparison.OrdinalIgnoreCase);

        v = v.Replace("Cybernetics", "Cybenetics", StringComparison.OrdinalIgnoreCase);

        v = v.Replace("Brons", "Bronze", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("Zilver", "Silver", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("Goud", "Gold", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("Platina", "Platinum", StringComparison.OrdinalIgnoreCase);

        return v;
    }

    private static string NormalizeColorEnglish(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

        var v = raw.Trim();
        v = v.Replace("Zwart", "Black", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("Wit", "White", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("Grijs", "Gray", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("Rood", "Red", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("Blauw", "Blue", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("Groen", "Green", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("Geel", "Yellow", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("Roze", "Pink", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("Paars", "Purple", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("Zilver", "Silver", StringComparison.OrdinalIgnoreCase);
        v = v.Replace("Goud", "Gold", StringComparison.OrdinalIgnoreCase);
        return v;
    }

    private static bool IsLikelyDutchColor(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var u = value.Trim().ToUpperInvariant();
        return u is "ZWART" or "WIT" or "GRIJS" or "ROOD" or "BLAUW" or "GROEN" or "GEEL" or "ROZE" or "PAARS" or "ZILVER" or "GOUD";
    }

    private static string InferCoolerType(ProductScrapeResult scrape)
    {
        if (TryGetSpec(scrape.Specs, out var t, "Soort"))
        {
            if (t.Contains("Waterkoeling", StringComparison.OrdinalIgnoreCase)) return "AIO";
            if (t.Contains("CPU-koeler", StringComparison.OrdinalIgnoreCase)) return "Air";
        }

        if (scrape.Specs.Keys.Any(k => k.Contains("Radiator", StringComparison.OrdinalIgnoreCase))) return "AIO";
        return "Air";
    }

    private static bool TryParseRadiatorSize(Dictionary<string, string> specs, out int radiatorMm)
    {
        radiatorMm = 0;
        if (!TryGetSpec(specs, out var v, "Radiatorgrootte")) return false;

        var m = Regex.Match(v, "(\\d)\\s*x\\s*(\\d{2,3})\\s*mm", RegexOptions.IgnoreCase);
        if (m.Success && int.TryParse(m.Groups[1].Value, out var count) && int.TryParse(m.Groups[2].Value, out var size))
        {
            radiatorMm = count * size;
            return radiatorMm > 0;
        }

        m = Regex.Match(v, "(\\d{3})\\s*mm", RegexOptions.IgnoreCase);
        if (m.Success && int.TryParse(m.Groups[1].Value, out var direct))
        {
            radiatorMm = direct;
            return radiatorMm > 0;
        }

        return false;
    }

    private static bool TryParseRadiatorSizeFromFan(Dictionary<string, string> specs, out int radiatorMm)
    {
        radiatorMm = 0;

        // Example value (from Alternate): "Fan 1  Aantal: 2 stuk(s), Breedte: 120 mm" => 240
        foreach (var kv in specs)
        {
            var text = $"{kv.Key} {kv.Value}";
            if (!text.Contains("Aantal", StringComparison.OrdinalIgnoreCase)) continue;
            if (!text.Contains("Breedte", StringComparison.OrdinalIgnoreCase)) continue;

            var mCount = Regex.Match(text, "Aantal:?\\s*(\\d)\\s*stuk", RegexOptions.IgnoreCase);
            var mWidth = Regex.Match(text, "Breedte:?\\s*(\\d{2,3})\\s*mm", RegexOptions.IgnoreCase);
            if (mCount.Success && mWidth.Success
                && int.TryParse(mCount.Groups[1].Value, out var count)
                && int.TryParse(mWidth.Groups[1].Value, out var width))
            {
                if (count is 2 or 3 && width is 120 or 140)
                {
                    radiatorMm = count * width;
                    return radiatorMm > 0;
                }
            }
        }

        return false;
    }

    private static bool TryParseCoolerSocket(Dictionary<string, string> specs, out int socket)
    {
        socket = 0;
        if (!TryGetSpec(specs, out var v, "Socket", "Sockets")) return false;

        var upper = v.ToUpperInvariant();
        var hits = 0;
        if (upper.Contains("1700")) hits++;
        if (upper.Contains("1200")) hits++;
        if (upper.Contains("AM5")) hits++;
        if (upper.Contains("AM4")) hits++;

        if (hits >= 2 || upper.Contains(','))
        {
            socket = 4; // Unknown
            return true;
        }

        return TryParseSocket(specs, out socket);
    }

    private static bool TryParseSocket(Dictionary<string, string> specs, out int socket)
    {
        socket = 0;
        if (!TryGetSpec(specs, out var v, "Socket")) return false;

        var u = v.ToUpperInvariant();
        if (u.Contains("1700")) { socket = 0; return true; }
        if (u.Contains("1200")) { socket = 1; return true; }
        if (u.Contains("AM5")) { socket = 2; return true; }
        if (u.Contains("AM4")) { socket = 3; return true; }

        return false;
    }

    private static bool TryParseFormFactor(Dictionary<string, string> specs, out int formFactor)
    {
        formFactor = 0;
        if (!TryGetSpec(specs, out var v, "Form factor", "Formfactor", "Form Factor", "Formaat")) return false;

        var u = v.ToUpperInvariant();
        if (u.Contains("EATX") || u.Contains("E-ATX")) { formFactor = 3; return true; }
        if (u.Contains("MICRO") || u.Contains("M-ATX") || u.Contains("MATX")) { formFactor = 1; return true; }
        if (u.Contains("MINI") || u.Contains("ITX")) { formFactor = 2; return true; }
        if (u.Contains("ATX")) { formFactor = 0; return true; }

        return false;
    }

    private static bool TryParseRamType(Dictionary<string, string> specs, out int ramType)
    {
        ramType = 0;

        static bool TryParseFromText(string text, out int parsed)
        {
            parsed = 0;
            if (string.IsNullOrWhiteSpace(text)) return false;
            var u = text.ToUpperInvariant();
            if (u.Contains("DDR5")) { parsed = 1; return true; }
            if (u.Contains("DDR4")) { parsed = 0; return true; }
            return false;
        }

        // Do NOT use a generic "Type" key here: too many Alternate pages include unrelated "Type" rows.
        if (TryGetSpec(specs, out var v,
                "Geheugentype",
                "Werkgeheugentype",
                "Geheugentype (RAM)",
                "Memory type",
                "RAM type",
                "Type geheugen",
                "Type RAM"))
        {
            if (TryParseFromText(v, out ramType)) return true;
        }

        // Fallback: scan all values for DDR4/DDR5.
        foreach (var kv in specs)
        {
            if (!kv.Key.Contains("Geheugen", StringComparison.OrdinalIgnoreCase)
                && !kv.Key.Contains("Memory", StringComparison.OrdinalIgnoreCase)
                && !kv.Value.Contains("DDR", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (TryParseFromText(kv.Value, out ramType)) return true;
        }

        return false;
    }

    private static bool TryParseInt(Dictionary<string, string> specs, out int value, params string[] keys)
    {
        value = 0;
        if (!TryGetSpec(specs, out var v, keys)) return false;
        return int.TryParse(ExtractFirstInt(v), out value) && value > 0;
    }

    private static bool TryParseBool(Dictionary<string, string> specs, out bool value, params string[] keys)
    {
        value = false;
        if (!TryGetSpec(specs, out var v, keys)) return false;

        var u = v.Trim().ToUpperInvariant();
        if (u is "JA" or "YES" or "TRUE" or "1") { value = true; return true; }
        if (u is "NEE" or "NO" or "FALSE" or "0") { value = false; return true; }

        if (u.Contains("JA")) { value = true; return true; }
        if (u.Contains("NEE")) { value = false; return true; }

        return false;
    }

    private static bool TryParseIntWithUnit(Dictionary<string, string> specs, out int value, string unit, params string[] keys)
    {
        value = 0;
        if (!TryGetSpec(specs, out var v, keys)) return false;

        // Handle thousand separators: "14.900 MB/s" => 14900, "1.200 W" => 1200
        var m = Regex.Match(v, $"(\\d{{1,3}}(?:[\\.,]\\d{{3}})+)\\s*{Regex.Escape(unit)}", RegexOptions.IgnoreCase);
        if (m.Success)
        {
            var digitsOnly = new string(m.Groups[1].Value.Where(char.IsDigit).ToArray());
            if (int.TryParse(digitsOnly, NumberStyles.Integer, CultureInfo.InvariantCulture, out value) && value > 0) return true;
        }

        m = Regex.Match(v, $"(\\d{{1,5}})\\s*{Regex.Escape(unit)}", RegexOptions.IgnoreCase);
        if (m.Success && int.TryParse(m.Groups[1].Value, out value) && value > 0) return true;

        return int.TryParse(ExtractFirstInt(v), out value) && value > 0;
    }

    private static bool TryParseDecimalWithUnit(Dictionary<string, string> specs, out decimal value, string unit, params string[] keys)
    {
        value = 0m;
        if (!TryGetSpec(specs, out var v, keys)) return false;

        // Thousand separators: "1.200 W" => 1200
        var m = Regex.Match(v, $"(\\d{{1,3}}(?:[\\.,]\\d{{3}})+)\\s*{Regex.Escape(unit)}", RegexOptions.IgnoreCase);
        if (m.Success)
        {
            var digitsOnly = new string(m.Groups[1].Value.Where(char.IsDigit).ToArray());
            if (decimal.TryParse(digitsOnly, NumberStyles.Number, CultureInfo.InvariantCulture, out value) && value > 0) return true;
        }

        // Decimals: "6,2 W" / "6.2 W"
        m = Regex.Match(v, $"(\\d{{1,5}}(?:[\\.,]\\d{{1,3}})?)\\s*{Regex.Escape(unit)}", RegexOptions.IgnoreCase);
        if (m.Success)
        {
            var numberText = m.Groups[1].Value.Replace(',', '.');
            return decimal.TryParse(numberText, NumberStyles.Number, CultureInfo.InvariantCulture, out value) && value > 0;
        }

        return false;
    }

    private static bool TryGetSpec(Dictionary<string, string> specs, out string value, params string[] keys)
    {
        foreach (var key in keys)
        {
            foreach (var kv in specs)
            {
                if (kv.Key.Equals(key, StringComparison.OrdinalIgnoreCase))
                {
                    value = kv.Value;
                    return !string.IsNullOrWhiteSpace(value);
                }

                if (kv.Key.Contains(key, StringComparison.OrdinalIgnoreCase))
                {
                    value = kv.Value;
                    return !string.IsNullOrWhiteSpace(value);
                }
            }
        }

        value = string.Empty;
        return false;
    }

    private static string ExtractFirstInt(string text)
    {
        var m = Regex.Match(text ?? string.Empty, "(\\d{1,5})", RegexOptions.CultureInvariant);
        return m.Success ? m.Groups[1].Value : "0";
    }

    private static bool SetIfMissingString(JsonObject obj, string key, string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var current = obj[key]?.ToString();
        if (!string.IsNullOrWhiteSpace(current)) return false;
        obj[key] = value;
        return true;
    }

    private static bool SetIfMissingOrDifferentString(JsonObject obj, string key, string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var current = obj[key]?.ToString();
        if (string.IsNullOrWhiteSpace(current))
        {
            obj[key] = value;
            return true;
        }

        if (string.Equals(current, value, StringComparison.OrdinalIgnoreCase)) return false;
        obj[key] = value;
        return true;
    }

    private static bool SetIfMissingOrDifferentIntAllowZero(JsonObject obj, string key, int value)
    {
        if (value < 0) return false;

        var currentRaw = obj[key]?.ToString();
        if (string.IsNullOrWhiteSpace(currentRaw))
        {
            obj[key] = value;
            return true;
        }

        if (int.TryParse(currentRaw, out var cur) && cur == value) return false;
        obj[key] = value;
        return true;
    }

    private static bool SetIfMissingInt(JsonObject obj, string key, int value)
    {
        if (value <= 0) return false;
        if (int.TryParse(obj[key]?.ToString(), out var cur) && cur > 0) return false;
        obj[key] = value;
        return true;
    }

    private static bool SetIfMissingDecimal(JsonObject obj, string key, decimal value)
    {
        if (value <= 0) return false;
        if (decimal.TryParse(obj[key]?.ToString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var cur) && cur > 0) return false;
        obj[key] = value;
        return true;
    }

    private static bool SetIfMissingBool(JsonObject obj, string key, bool value)
    {
        if (obj[key] is not null)
        {
            if (bool.TryParse(obj[key]?.ToString(), out var cur))
            {
                if (cur) return false;
            }
        }

        if (!value) return false;
        obj[key] = true;
        return true;
    }
}
