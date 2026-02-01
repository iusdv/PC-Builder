using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using AngleSharp.Dom;
using PCPartScraper.Models;

namespace PCPartScraper.Services;

/// <summary>
/// Simple, server-rendered HTML scraper for Alternate.nl.
/// Uses /listing.xhtml?q=... to find a product page, then scrapes canonical URL, og:image, and price.
/// </summary>
public sealed class AlternateScrapeService : IProductScrapeService
{
    private const string BaseUrl = "https://www.alternate.nl";

    private readonly RateLimitedScraper _scraper;

    public AlternateScrapeService(RateLimitedScraper scraper)
    {
        _scraper = scraper;
    }

    public async Task<ProductScrapeResult> SearchAndScrapeAsync(string query, CancellationToken cancellationToken = default)
    {
        var result = new ProductScrapeResult { Query = query };

        var searchUrl = $"{BaseUrl}/listing.xhtml?q={Uri.EscapeDataString(query)}";
        var searchDoc = await _scraper.GetDocumentAsync(searchUrl);
        if (searchDoc == null) return result;

        var candidates = ExtractProductCandidates(searchDoc);
        if (candidates.Count == 0) return result;

        var queryTokens = Tokenize(query);

        var best = candidates
            .Select(c => new
            {
                Candidate = c,
                Score = Jaccard(queryTokens, Tokenize(c.Text))
            })
            .OrderByDescending(x => x.Score)
            .ThenByDescending(x => x.Candidate.Text.Length)
            .First();

        if (best.Score <= 0)
        {
            best = new { Candidate = candidates[0], Score = 0.0 };
        }

        var scrape = await ScrapeProductAsync(best.Candidate.AbsoluteUrl, query, cancellationToken);
        scrape.MatchedText = best.Candidate.Text;
        scrape.Score = best.Score;
        return scrape;
    }

    public async Task<ProductScrapeResult> ScrapeProductAsync(string productUrl, string? query = null, CancellationToken cancellationToken = default)
    {
        var result = new ProductScrapeResult
        {
            Query = query ?? string.Empty,
            ProductUrl = NormalizeUrl(productUrl)
        };

        var productDoc = await _scraper.GetDocumentAsync(result.ProductUrl);
        if (productDoc == null) return result;

        // Name/manufacturer
        result.Name = CollapseWhitespace(productDoc.QuerySelector("h1")?.TextContent ?? string.Empty);
        result.Manufacturer = ExtractManufacturerFromUrl(result.ProductUrl);

        // Prefer canonical URL if present
        var canonical = productDoc.QuerySelector("link[rel='canonical']")?.GetAttribute("href");
        if (!string.IsNullOrWhiteSpace(canonical))
        {
            result.ProductUrl = canonical.StartsWith("http", StringComparison.OrdinalIgnoreCase)
                ? canonical
                : $"{BaseUrl}{canonical}";
        }

        // Prefer og:image
        var ogImage = productDoc.QuerySelector("meta[property='og:image']")?.GetAttribute("content")
                      ?? productDoc.QuerySelector("meta[name='og:image']")?.GetAttribute("content");

        if (!string.IsNullOrWhiteSpace(ogImage))
        {
            result.ImageUrl = NormalizeUrl(ogImage);
        }

        // Specs (used to populate category-specific DB fields)
        result.Specs = ExtractSpecs(productDoc);

        // Price from meta tags
        var metaPrice = productDoc.QuerySelector("meta[property='product:price:amount']")?.GetAttribute("content")
                        ?? productDoc.QuerySelector("meta[itemprop='price']")?.GetAttribute("content")
                        ?? productDoc.QuerySelector("meta[name='price']")?.GetAttribute("content");

        if (TryParseEuroPrice(metaPrice, out var metaParsed) && metaParsed > 0)
        {
            result.Price = metaParsed;
            return result;
        }

        // Price from JSON-LD
        var jsonLdNodes = productDoc.QuerySelectorAll("script[type='application/ld+json']");
        foreach (var node in jsonLdNodes)
        {
            var text = node.TextContent;
            if (string.IsNullOrWhiteSpace(text)) continue;

            if (TryExtractPriceFromJsonLd(text, out var jsonLdPrice) && jsonLdPrice > 0)
            {
                result.Price = jsonLdPrice;
                return result;
            }
        }

        // Fallback: regex scan of page text for a euro price
        var pageText = CollapseWhitespace(productDoc.Body?.TextContent ?? string.Empty);
        if (TryExtractEuroFromText(pageText, out var euroText)
            && TryParseEuroPrice(euroText, out var parsed)
            && parsed > 0)
        {
            result.Price = parsed;
        }

        return result;
    }

    private sealed record ProductCandidate(string AbsoluteUrl, string Text);

    private static List<ProductCandidate> ExtractProductCandidates(IDocument document)
    {
        var anchors = document.QuerySelectorAll("a[href]");
        var candidates = new List<ProductCandidate>();

        foreach (var a in anchors)
        {
            var href = a.GetAttribute("href");
            if (string.IsNullOrWhiteSpace(href)) continue;

            // Alternate product URLs typically contain /html/product/
            if (!href.Contains("/html/product/", StringComparison.OrdinalIgnoreCase)) continue;

            var text = CollapseWhitespace((a.TextContent ?? string.Empty).Trim());
            if (text.Length < 6) continue;

            // Skip obvious non-product anchors
            if (text.StartsWith("Vorige pagina", StringComparison.OrdinalIgnoreCase)) continue;
            if (text.StartsWith("Volgende pagina", StringComparison.OrdinalIgnoreCase)) continue;

            candidates.Add(new ProductCandidate(NormalizeUrl(href), text));
        }

        return candidates
            .GroupBy(c => c.AbsoluteUrl, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .ToList();
    }

    private static string NormalizeUrl(string href)
    {
        href = href.Trim();

        if (href.StartsWith("//")) return $"https:{href}";
        if (href.StartsWith("http", StringComparison.OrdinalIgnoreCase)) return href;
        if (href.StartsWith("/")) return $"{BaseUrl}{href}";

        // Relative-ish path
        return $"{BaseUrl}/{href.TrimStart('/')}";
    }

    private static string ExtractManufacturerFromUrl(string? absoluteUrl)
    {
        if (string.IsNullOrWhiteSpace(absoluteUrl)) return string.Empty;

        try
        {
            var uri = new Uri(absoluteUrl);
            var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            // /{brand}/{product-name}/html/product/{id}
            if (segments.Length >= 1)
            {
                return Uri.UnescapeDataString(segments[0]);
            }
        }
        catch
        {
            // ignore
        }

        return string.Empty;
    }

    private static Dictionary<string, string> ExtractSpecs(IDocument document)
    {
        var specs = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        // Alternate has a "Specificaties" section rendered as one or more HTML tables.
        foreach (var table in document.QuerySelectorAll("table"))
        {
            string? lastHeader = null;
            foreach (var row in table.QuerySelectorAll("tr"))
            {
                var cells = row.QuerySelectorAll("th, td")
                    .Select(c => CollapseWhitespace(c.TextContent ?? string.Empty))
                    .ToList();

                if (cells.Count == 2)
                {
                    AddSpec(specs, cells[0], cells[1]);
                }
                else if (cells.Count == 3)
                {
                    // e.g. grouped rows:
                    // "Afmeting (BxHxD) | Fan 1 | ..." then "(blank) | Totaal | ..."
                    var header = cells[0];
                    var subKey = cells[1];
                    var value = cells[2];

                    if (!string.IsNullOrWhiteSpace(header))
                    {
                        lastHeader = header;
                        AddSpec(specs, $"{header} {subKey}", value);
                    }
                    else if (!string.IsNullOrWhiteSpace(lastHeader))
                    {
                        AddSpec(specs, $"{lastHeader} {subKey}", value);
                    }
                    else
                    {
                        AddSpec(specs, subKey, value);
                    }
                }
            }
        }

        return specs;
    }

    private static void AddSpec(Dictionary<string, string> specs, string key, string value)
    {
        key = CollapseWhitespace(key);
        value = CollapseWhitespace(value);
        if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(value)) return;

        // Keep first occurrence; tables sometimes repeat keys
        if (!specs.ContainsKey(key))
        {
            specs[key] = value;
        }
    }



    private static bool TryExtractEuroFromText(string text, out string euroText)
    {
        // Match both "€ 1.149,00" and "€ 49,99" and "€ 429,00"
        var m = Regex.Match(text, "€\\s*[0-9]{1,3}(?:\\.[0-9]{3})*(?:,[0-9]{2})?", RegexOptions.CultureInvariant);
        if (m.Success)
        {
            euroText = m.Value;
            return true;
        }

        euroText = string.Empty;
        return false;
    }

    private static bool TryParseEuroPrice(string? priceText, out decimal price)
    {
        price = 0;
        if (string.IsNullOrWhiteSpace(priceText)) return false;

        // Keep digits and separators only
        var cleaned = new string(priceText
            .Where(c => char.IsDigit(c) || c == '.' || c == ',')
            .ToArray());

        if (string.IsNullOrWhiteSpace(cleaned)) return false;

        // Heuristics for EU formatting:
        // - If both '.' and ',' exist -> '.' thousands, ',' decimal
        // - If only ',' exists -> ',' decimal
        // - If only '.' exists -> treat '.' as decimal if it looks like cents, else just parse
        if (cleaned.Contains('.') && cleaned.Contains(','))
        {
            cleaned = cleaned.Replace(".", "").Replace(',', '.');
        }
        else if (cleaned.Contains(','))
        {
            cleaned = cleaned.Replace(',', '.');
        }

        return decimal.TryParse(cleaned, NumberStyles.Number, CultureInfo.InvariantCulture, out price);
    }

    private static bool TryExtractPriceFromJsonLd(string json, out decimal price)
    {
        price = 0;

        try
        {
            using var doc = JsonDocument.Parse(json);
            if (TryExtractPriceFromJsonLdElement(doc.RootElement, out price)) return true;
        }
        catch
        {
            // ignore
        }

        return false;
    }

    private static bool TryExtractPriceFromJsonLdElement(JsonElement element, out decimal price)
    {
        price = 0;

        if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                if (TryExtractPriceFromJsonLdElement(item, out price)) return true;
            }

            return false;
        }

        if (element.ValueKind != JsonValueKind.Object) return false;

        // Direct "price" field
        if (element.TryGetProperty("price", out var priceProp))
        {
            var s = priceProp.ValueKind == JsonValueKind.String ? priceProp.GetString() : priceProp.ToString();
            if (TryParseEuroPrice(s, out var p) && p > 0)
            {
                price = p;
                return true;
            }
        }

        // offers.price
        if (element.TryGetProperty("offers", out var offers))
        {
            if (TryExtractPriceFromJsonLdElement(offers, out price)) return true;
        }

        // Some schemas use "lowPrice" / "highPrice"
        if (element.TryGetProperty("lowPrice", out var lowPrice))
        {
            var s = lowPrice.ValueKind == JsonValueKind.String ? lowPrice.GetString() : lowPrice.ToString();
            if (TryParseEuroPrice(s, out var p) && p > 0)
            {
                price = p;
                return true;
            }
        }

        if (element.TryGetProperty("highPrice", out var highPrice))
        {
            var s = highPrice.ValueKind == JsonValueKind.String ? highPrice.GetString() : highPrice.ToString();
            if (TryParseEuroPrice(s, out var p) && p > 0)
            {
                price = p;
                return true;
            }
        }

        // Walk properties recursively
        foreach (var prop in element.EnumerateObject())
        {
            if (TryExtractPriceFromJsonLdElement(prop.Value, out price)) return true;
        }

        return false;
    }

    private static HashSet<string> Tokenize(string text)
    {
        var cleaned = Regex.Replace(text.ToLowerInvariant(), "[^a-z0-9]+", " ").Trim();
        if (string.IsNullOrWhiteSpace(cleaned)) return new HashSet<string>(StringComparer.Ordinal);

        var stop = new HashSet<string>(StringComparer.Ordinal)
        {
            "cpu", "processor", "gpu", "graphics", "card", "video", "motherboard", "ram", "memory",
            "ssd", "hdd", "storage", "power", "supply", "psu", "case", "cooler", "liquid", "air",
            "with", "and", "the", "for"
        };

        var tokens = cleaned
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(t => t.Length >= 2)
            .Where(t => !stop.Contains(t));

        return new HashSet<string>(tokens, StringComparer.Ordinal);
    }

    private static double Jaccard(HashSet<string> a, HashSet<string> b)
    {
        if (a.Count == 0 || b.Count == 0) return 0;

        var intersection = a.Intersect(b).Count();
        if (intersection == 0) return 0;
        var union = a.Union(b).Count();
        return union == 0 ? 0 : (double)intersection / union;
    }

    private static string CollapseWhitespace(string s) => Regex.Replace(s, "\\s+", " ").Trim();
}
