using System.Text.Json.Nodes;
using PCPartScraper.Models;

namespace PCPartScraper.Services;

public sealed class AlternateBulkImportRunner
{
    private readonly PartsApiClient _api;
    private readonly AlternateListingCrawler _listing;
    private readonly AlternateScrapeService _scraper;
    private readonly DiskJsonCache<ProductScrapeResult> _cache;
    private readonly ImageUrlValidator? _imageValidator;

    public AlternateBulkImportRunner(
        PartsApiClient api,
        AlternateListingCrawler listing,
        AlternateScrapeService scraper,
        DiskJsonCache<ProductScrapeResult> cache,
        ImageUrlValidator? imageValidator = null)
    {
        _api = api;
        _listing = listing;
        _scraper = scraper;
        _cache = cache;
        _imageValidator = imageValidator;
    }

    public async Task RunAsync(
        IReadOnlyList<int> categories,
        int maxCreates,
        int maxPagesPerQuery,
        bool fillSpecs,
        bool verifyImages,
        bool dryRun,
        CancellationToken cancellationToken = default)
    {
        maxCreates = Math.Max(1, maxCreates);
        maxPagesPerQuery = Math.Clamp(maxPagesPerQuery, 1, 100);

        verifyImages = verifyImages && _imageValidator != null;

        var existing = await _api.GetAllPartsAsync(cancellationToken: cancellationToken);
        var existingByProductUrl = new HashSet<string>(existing
            .Where(p => !string.IsNullOrWhiteSpace(p.ProductUrl))
            .Select(p => p.ProductUrl!.Trim()), StringComparer.OrdinalIgnoreCase);

        var existingByName = new HashSet<string>(existing
            .Where(p => !string.IsNullOrWhiteSpace(p.Name))
            .Select(p => NormalizeNameKey(p.Manufacturer, p.Name)), StringComparer.OrdinalIgnoreCase);

        Console.WriteLine($"Existing parts in DB: {existing.Count}");

        var created = 0;
        var skipped = 0;
        var errors = 0;
        var attemptedCreates = 0;

        var imageCheckCache = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
        var cacheDirty = 0;

        foreach (var category in categories)
        {
            if (created >= maxCreates) break;

            var categoryName = PartsApiClient.CategoryName(category);
            var queries = DefaultQueriesForCategory(category);

            Console.WriteLine();
            Console.WriteLine($"== Bulk import: {categoryName} ==");
            Console.WriteLine($"Queries: {string.Join(", ", queries)}");

            foreach (var query in queries)
            {
                if (created >= maxCreates) break;

                for (var page = 1; page <= maxPagesPerQuery; page++)
                {
                    if (created >= maxCreates) break;

                    Console.WriteLine($"[list] {categoryName} q='{query}' page={page}");
                    var urls = await _listing.GetProductUrlsAsync(query, page, cancellationToken);
                    if (urls.Count == 0) break;

                    foreach (var productUrl in urls)
                    {
                        if (created >= maxCreates) break;

                        if (IsObviouslyNotAComponentProductUrl(productUrl))
                        {
                            skipped++;
                            continue;
                        }

                        // Hard stop if we're not creating anything and the API is rejecting posts.
                        if (!dryRun && created == 0 && errors >= 25)
                        {
                            Console.WriteLine("Stopping early: too many API create failures (0 created).");
                            Console.WriteLine("Fix the API validation/body mapping (see [api] POST logs) then re-run.");
                            return;
                        }

                        // Overall attempt cap: prevents infinite loops when the API keeps rejecting.
                        if (!dryRun && attemptedCreates >= Math.Max(200, maxCreates * 5))
                        {
                            Console.WriteLine("Stopping early: too many create attempts without reaching target.");
                            return;
                        }

                        // Cache by product URL.
                        var cacheKey = $"url:{productUrl}";
                        ProductScrapeResult scrape;

                        if (_cache.TryGet(cacheKey, out var cached)
                            && string.Equals(cached.ProductUrl, productUrl, StringComparison.OrdinalIgnoreCase)
                            && !string.IsNullOrWhiteSpace(cached.ImageUrl)
                            && (!fillSpecs || (cached.Specs is { Count: > 0 })))
                        {
                            scrape = cached;
                        }
                        else
                        {
                            scrape = await _scraper.ScrapeProductAsync(productUrl, query, cancellationToken);
                            _cache.Set(cacheKey, scrape);
                            cacheDirty++;
                            if (cacheDirty >= 25)
                            {
                                await _cache.SaveAsync(cancellationToken);
                                cacheDirty = 0;
                            }
                        }

                        // Must have an image.
                        if (string.IsNullOrWhiteSpace(scrape.ImageUrl))
                        {
                            skipped++;
                            continue;
                        }

                        if (verifyImages)
                        {
                            var img = scrape.ImageUrl.Trim();
                            if (!imageCheckCache.TryGetValue(img, out var imageOk))
                            {
                                imageOk = await _imageValidator!.IsWorkingImageAsync(img, cancellationToken);
                                imageCheckCache[img] = imageOk;
                            }

                            if (!imageOk)
                            {
                                skipped++;
                                continue;
                            }
                        }

                        // Skip obvious mismatches.
                        if (!LooksLikeCategory(category, scrape))
                        {
                            skipped++;
                            continue;
                        }

                        if (!string.IsNullOrWhiteSpace(scrape.ProductUrl) && existingByProductUrl.Contains(scrape.ProductUrl))
                        {
                            skipped++;
                            continue;
                        }

                        var nameKey = NormalizeNameKey(scrape.Manufacturer, scrape.Name ?? scrape.Query);
                        if (existingByName.Contains(nameKey))
                        {
                            skipped++;
                            continue;
                        }

                        var body = PartSpecMapper.BuildCreateBody(category, scrape);
                        if (fillSpecs)
                        {
                            _ = PartSpecMapper.ApplySpecsToPartJson(category, body, scrape);
                        }

                        // Enforce image required on create.
                        if (string.IsNullOrWhiteSpace(body["imageUrl"]?.ToString()))
                        {
                            skipped++;
                            continue;
                        }

                        if (dryRun)
                        {
                            Console.WriteLine($"[dry-run] create {categoryName}: {scrape.Name} -> {scrape.ProductUrl}");
                            created++;
                            if (!string.IsNullOrWhiteSpace(scrape.ProductUrl)) existingByProductUrl.Add(scrape.ProductUrl);
                            existingByName.Add(nameKey);
                            continue;
                        }

                        attemptedCreates++;
                        var ok = await _api.PostPartDetailsJsonAsync(category, body, cancellationToken);
                        if (ok)
                        {
                            created++;
                            if (!string.IsNullOrWhiteSpace(scrape.ProductUrl)) existingByProductUrl.Add(scrape.ProductUrl);
                            existingByName.Add(nameKey);
                            Console.WriteLine($"[created] {categoryName}: {scrape.Name} (€{(scrape.Price ?? 0):0.00})");
                        }
                        else
                        {
                            errors++;
                            Console.WriteLine($"[failed] {categoryName}: {scrape.Name} -> {scrape.ProductUrl}");
                        }
                    }

                    // If this listing page returned fewer than the typical page size, stop paging.
                    if (urls.Count < 12) break;
                }
            }
        }

        if (cacheDirty > 0)
        {
            await _cache.SaveAsync(cancellationToken);
        }

        Console.WriteLine();
        Console.WriteLine($"Done. created={created}, skipped={skipped}, errors={errors}");
    }

    private static IReadOnlyList<string> DefaultQueriesForCategory(int category)
    {
        return category switch
        {
            0 => new[]
            {
                "ryzen", "ryzen 9", "ryzen 7", "ryzen 5",
                "core i9", "core i7", "core i5",
                "amd processor", "intel processor", "threadripper"
            },
            1 => new[]
            {
                "moederbord", "motherboard",
                "B650", "B550", "X670", "X570", "Z790", "Z690", "B760",
                "AM5", "AM4", "LGA1700",
                "mini itx", "micro atx", "atx"
            },
            2 => new[]
            {
                "werkgeheugen", "geheugenkit",
                "ram", "ram werkgeheugen", "ram geheugen",
                "ddr5 werkgeheugen", "ddr5 32 gb", "ddr5 64 gb",
                "ddr4 werkgeheugen", "ddr4 16 gb", "ddr4 32 gb",
                "corsair ddr5 werkgeheugen", "g.skill ddr5", "kingston fury ddr5", "crucial ddr5"
            },
            3 => new[]
            {
                "rtx", "rtx 4090", "rtx 4080", "rtx 4070", "rtx 4060",
                "radeon", "rx 7900", "rx 7800", "rx 7700", "rx 7600",
                "intel arc"
            },
            4 => new[]
            {
                "nvme", "m.2", "ssd", "ssd 1tb", "ssd 2tb",
                "hdd", "hdd 4tb", "hdd 8tb",
                "sata ssd"
            },
            5 => new[]
            {
                "voeding", "psu",
                "650w", "750w", "850w", "1000w",
                "corsair", "seasonic", "be quiet", "cooler master"
            },
            6 => new[]
            {
                // Use more specific queries; broad case searches sometimes return stripped markup.
                "lian li o11", "o11 dynamic",
                "fractal north", "meshify", "torrent",
                "nzxt h5", "nzxt h7",
                "corsair 4000d", "corsair 5000d",
                "cooler master nr200",
                "pop air"
            },
            7 => new[]
            {
                // Alternate.nl search terms: "cpu koeler" currently yields no results.
                // Use broader / commonly-used Dutch terms that do return product listings.
                "koeler", "cpu-koeler", "processorkoeler",
                "cpu koeling", "luchtkoeler",
                "aio", "aio 240", "aio 360",
                "waterkoeling",
                "noctua", "be quiet", "arctic", "cooler master"
            },
            8 => new[]
            {
                "case fan", "case-fan",
                "behuizing ventilator", "behuizing ventilatoren",
                "120mm case fan", "140mm case fan",
                "noctua case fan", "arctic case fan", "be quiet case fan"
            },
            _ => new[] { "pc" }
        };
    }

    private static bool LooksLikeCategory(int category, ProductScrapeResult scrape)
    {
        var name = (scrape.Name ?? string.Empty).ToLowerInvariant();
        var url = (scrape.ProductUrl ?? string.Empty).ToLowerInvariant();
        var specs = scrape.Specs ?? new Dictionary<string, string>();

        bool HasSpecKey(string contains)
            => specs.Keys.Any(k => k.Contains(contains, StringComparison.OrdinalIgnoreCase));

        // Exclude obvious non-component categories that show up in search.
        if (name.Contains("laptop") || name.Contains("notebook") || name.Contains("desktop") || name.Contains("pc-systeem") || name.Contains("gaming pc"))
        {
            return false;
        }

        // Extra guardrails against cross-category search noise.
        if (category == 5)
        {
            // PSU searches often return cases ("behuizing") that include a PSU.
            if (name.Contains("behuizing") || url.Contains("behuizing")) return false;
        }

        if (category == 6)
        {
            // Case searches can return PSUs ("voeding").
            if (name.Contains("voeding") || url.Contains("voeding")) return false;

            // Some queries (e.g. "pc case") can return case fans and other accessories.
            if (name.Contains("case fan") || url.Contains("case-fan")) return false;
        }

        if (category == 8)
        {
            // Case fan searches can return full cases.
            // BUT: Dutch case fan product names often include "behuizing ventilator" (contains "behuizing").
            // So only reject "behuizing" hits that don't also look like a fan.
            var looksLikeFan = name.Contains("fan") || name.Contains("ventilator") || url.Contains("case-fan") || HasSpecKey("Ventilator");
            var looksLikeCase = name.Contains("behuizing") || url.Contains("behuizing");
            if (looksLikeCase && !looksLikeFan) return false;
        }

        if (category == 1)
        {
            // Motherboard searches return mounting kits/frames.
            if (name.Contains("contact frame") || name.Contains("retrofit") || name.Contains("inbouwkit") || name.Contains("backplate") || name.Contains("houder"))
            {
                return false;
            }
        }

        return category switch
        {
            0 => name.Contains("processor") || (HasSpecKey("Socket") && (HasSpecKey("Cores") || HasSpecKey("Aantal cores"))),
            1 => name.Contains("moederbord") || (HasSpecKey("Chipset") && HasSpecKey("Socket")),
            2 => name.Contains("werkgeheugen") || HasSpecKey("DDR"),
            3 => name.Contains("grafische kaart") || HasSpecKey("Grafische chip"),
            4 => name.Contains("ssd") || name.Contains("hdd") || HasSpecKey("Opslag") || HasSpecKey("Capaciteit"),
            5 => (name.Contains("voeding") || name.Contains("psu") || url.Contains("voeding") || HasSpecKey("80") || HasSpecKey("80 plus")) && !name.Contains("behuizing"),
            6 => name.Contains("behuizing") || url.Contains("behuizing") || name.Contains("case") || name.Contains("tower"),
            7 => name.Contains("koeler") || HasSpecKey("Radiator") || HasSpecKey("Hoogte"),
            8 => name.Contains("case fan") || name.Contains("casefan") || name.Contains("behuizing") || name.Contains("ventilator") || url.Contains("case-fan") || HasSpecKey("Ventilator"),
            _ => true
        };
    }

    private static string NormalizeNameKey(string? manufacturer, string? name)
    {
        return $"{(manufacturer ?? string.Empty).Trim().ToLowerInvariant()}|{(name ?? string.Empty).Trim().ToLowerInvariant()}";
    }

    private static bool IsObviouslyNotAComponentProductUrl(string productUrl)
    {
        if (string.IsNullOrWhiteSpace(productUrl)) return true;

        // Alternate product URLs include the slug, so we can cheaply skip noise before fetching the product page.
        var u = productUrl.ToLowerInvariant();

        // Full systems / laptops
        if (u.Contains("laptop") || u.Contains("notebook") || u.Contains("gaming-laptop")) return true;
        if (u.Contains("gaming-pc") || u.Contains("pc-systeem") || u.Contains("desktop-pc") || u.Contains("workstation")) return true;

        // Common non-component accessories that show up for GPU/CPU queries (waterblocks, brackets, etc.)
        if (u.Contains("waterblock") || u.Contains("eisblock") || u.Contains("ek-quantum")) return true;
        if (u.Contains("mount") || u.Contains("bracket") || u.Contains("adapter")) return true;

        return false;
    }
}
