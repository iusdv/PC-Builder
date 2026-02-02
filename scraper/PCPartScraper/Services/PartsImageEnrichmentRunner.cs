using System.Text.Json.Nodes;
using PCPartScraper.Models;

namespace PCPartScraper.Services;

public sealed class PartsImageEnrichmentRunner
{
    private readonly PartsApiClient _api;
    private readonly IProductScrapeService _scraper;
    private readonly DiskJsonCache<ProductScrapeResult> _cache;

    public PartsImageEnrichmentRunner(PartsApiClient api, IProductScrapeService scraper, DiskJsonCache<ProductScrapeResult> cache)
    {
        _api = api;
        _scraper = scraper;
        _cache = cache;
    }

    public async Task RunAsync(int maxPartsToProcess, bool onlyMissing, bool fillSpecs, CancellationToken cancellationToken = default)
    {
        var parts = await _api.GetAllPartsAsync(cancellationToken: cancellationToken);

        var candidates = parts
            .Where(p => !string.IsNullOrWhiteSpace(p.Name))
            .Where(p => !onlyMissing || string.IsNullOrWhiteSpace(p.ImageUrl) || string.IsNullOrWhiteSpace(p.ProductUrl) || p.Price <= 0)
            .ToList();

        Console.WriteLine($"Found {parts.Count} parts total. {candidates.Count} eligible for enrichment.");

        var processed = 0;
        var updated = 0;
        var skipped = 0;

        foreach (var part in candidates)
        {
            if (processed >= maxPartsToProcess) break;
            processed++;

            var categoryId = PartsApiClient.ParseCategory(part.Category);
            var categoryName = PartsApiClient.CategoryName(categoryId);
            var cacheKey = $"{categoryName}:{part.Name}";
            var needPrice = part.Price <= 0;
            var needSpecs = fillSpecs;

            ProductScrapeResult scrape;
            if (_cache.TryGet(cacheKey, out var cached)
                && (!string.IsNullOrWhiteSpace(cached.ProductUrl) || !string.IsNullOrWhiteSpace(cached.ImageUrl))
                && (!needPrice || (cached.Price.HasValue && cached.Price.Value > 0))
                && (!needSpecs || (cached.Specs is { Count: > 0 })))
            {
                scrape = cached;
                Console.WriteLine($"[cache] {categoryName} #{part.Id} {part.Name} -> {scrape.ProductUrl ?? "(no url)"}");
            }
            else
            {
                Console.WriteLine($"[scrape] {categoryName} #{part.Id} {part.Name}");
                scrape = await _scraper.SearchAndScrapeAsync(part.Name, cancellationToken);
                _cache.Set(cacheKey, scrape);
                await _cache.SaveAsync(cancellationToken);
            }

            {
                var score = scrape.Score.HasValue ? scrape.Score.Value.ToString("0.00") : "-";
                Console.WriteLine($"        -> url={(string.IsNullOrWhiteSpace(scrape.ProductUrl) ? "(none)" : scrape.ProductUrl)}");
                Console.WriteLine($"        -> img={(string.IsNullOrWhiteSpace(scrape.ImageUrl) ? "(none)" : scrape.ImageUrl)} (score={score})");
                Console.WriteLine($"        -> price={(scrape.Price.HasValue ? scrape.Price.Value.ToString("0.00") : "(none)")}");
            }

            if (string.IsNullOrWhiteSpace(scrape.ProductUrl) && string.IsNullOrWhiteSpace(scrape.ImageUrl))
            {
                skipped++;
                continue;
            }

            var json = await _api.GetPartDetailsAsJsonAsync(part, cancellationToken);
            if (json == null)
            {
                skipped++;
                continue;
            }

            var changed = false;

            if (!string.IsNullOrWhiteSpace(scrape.ImageUrl))
            {
                var current = json["imageUrl"]?.ToString();
                if (string.IsNullOrWhiteSpace(current))
                {
                    json["imageUrl"] = scrape.ImageUrl;
                    changed = true;
                }
            }

            if (!string.IsNullOrWhiteSpace(scrape.ProductUrl))
            {
                var current = json["productUrl"]?.ToString();
                if (string.IsNullOrWhiteSpace(current))
                {
                    json["productUrl"] = scrape.ProductUrl;
                    changed = true;
                }
            }

            if (needPrice && scrape.Price.HasValue && scrape.Price.Value > 0)
            {
                var current = 0m;
                try
                {
                    _ = decimal.TryParse(json["price"]?.ToString(), out current);
                }
                catch
                {
                    // ignore
                }

                if (current <= 0)
                {
                    json["price"] = scrape.Price.Value;
                    changed = true;
                }
            }

            if (fillSpecs)
            {
                changed |= PartSpecMapper.ApplySpecsToPartJson(categoryId, json, scrape);
            }

            if (!changed)
            {
                skipped++;
                continue;
            }

            var ok = await _api.PutPartDetailsJsonAsync(part, json, cancellationToken);
            if (ok)
            {
                updated++;
                var score = scrape.Score.HasValue ? scrape.Score.Value.ToString("0.00") : "-";
                Console.WriteLine($"[updated] {categoryName} #{part.Id} (score={score})");
            }
            else
            {
                Console.WriteLine($"[failed] {categoryName} #{part.Id}");
            }
        }

        Console.WriteLine();
        Console.WriteLine($"Done. processed={processed}, updated={updated}, skipped={skipped}");
    }
}
