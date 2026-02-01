using AngleSharp.Dom;
using System.Text.RegularExpressions;

namespace PCPartScraper.Services;

public sealed class AlternateListingCrawler
{
    private const string BaseUrl = "https://www.alternate.nl";

    private readonly RateLimitedScraper _scraper;

    public AlternateListingCrawler(RateLimitedScraper scraper)
    {
        _scraper = scraper;
    }

    public async Task<List<string>> GetProductUrlsAsync(string query, int page, CancellationToken cancellationToken = default)
    {
        if (page < 1) page = 1;

        var url = $"{BaseUrl}/listing.xhtml?q={Uri.EscapeDataString(query)}&page={page}";
        var (doc, html) = await _scraper.GetDocumentWithHtmlAsync(url);
        if (doc == null) return new List<string>();

        // Product links. Some searches render full-card anchors (class contains 'productBox'),
        // others link the product title only. Collect all product-page anchors and de-dupe.
        var productAnchors = doc.QuerySelectorAll("a[href*='/html/product/']");

        var urls = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var a in productAnchors)
        {
            var href = a.GetAttribute("href");
            if (string.IsNullOrWhiteSpace(href)) continue;

            var abs = NormalizeUrl(href);
            if (seen.Add(abs)) urls.Add(abs);
        }

        // Fallback: some listing pages embed product URLs in JSON or other markup
        // where they are not present as literal <a href> attributes.
        if (urls.Count == 0 && !string.IsNullOrWhiteSpace(html))
        {
            foreach (var href in ExtractProductUrlsFromHtml(html))
            {
                var abs = NormalizeUrl(href);
                if (seen.Add(abs)) urls.Add(abs);
            }
        }

        return urls;
    }

    private static IEnumerable<string> ExtractProductUrlsFromHtml(string html)
    {
        // Match normal href attributes
        var hrefRegex = new Regex("href\\s*=\\s*(?:\"|')(?<href>[^\"']*/html/product/[^\"']+)(?:\"|')", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        foreach (Match m in hrefRegex.Matches(html))
        {
            var href = m.Groups["href"].Value;
            if (!string.IsNullOrWhiteSpace(href)) yield return href;
        }

        // Match JSON-escaped occurrences like \/nvidia\/foo\/html\/product\/123
        var escapedRegex = new Regex("(?<href>\\/[^\"\\s]*html\\/product\\/[^\"\\s]+)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        foreach (Match m in escapedRegex.Matches(html))
        {
            var href = m.Groups["href"].Value;
            if (!string.IsNullOrWhiteSpace(href)) yield return href.Replace("\\/", "/", StringComparison.Ordinal);
        }
    }

    private static string NormalizeUrl(string href)
    {
        href = href.Trim();

        if (href.StartsWith("//")) return $"https:{href}";
        if (href.StartsWith("http", StringComparison.OrdinalIgnoreCase)) return href;
        if (href.StartsWith("/")) return $"{BaseUrl}{href}";

        return $"{BaseUrl}/{href.TrimStart('/')}";
    }
}
