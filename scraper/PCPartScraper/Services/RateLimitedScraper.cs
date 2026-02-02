using System.Globalization;
using AngleSharp;
using AngleSharp.Dom;

namespace PCPartScraper.Services;

public class RateLimitedScraper
{
    private readonly HttpClient _httpClient;
    private readonly IBrowsingContext _context;
    private readonly int _delayMs;
    private DateTime _lastRequest = DateTime.MinValue;

    public RateLimitedScraper(int delayMilliseconds = 750)
    {
        _httpClient = new HttpClient();
        // Alternate.nl can return reduced/blocked markup for non-browser clients.
        // Use a browser-like UA and headers to improve consistency.
        _httpClient.DefaultRequestHeaders.Add(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");
        _httpClient.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8");
        _httpClient.DefaultRequestHeaders.Add("Accept-Language", "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7");
        _delayMs = delayMilliseconds;
        
        var config = Configuration.Default;
        _context = BrowsingContext.New(config);
    }

    public async Task<IDocument?> GetDocumentAsync(string url)
    {
        var (doc, _) = await GetDocumentWithHtmlAsync(url);
        return doc;
    }

    public async Task<(IDocument? Document, string Html)> GetDocumentWithHtmlAsync(string url)
    {
        // Rate limiting
        var timeSinceLastRequest = DateTime.Now - _lastRequest;
        if (timeSinceLastRequest.TotalMilliseconds < _delayMs)
        {
            await Task.Delay(_delayMs - (int)timeSinceLastRequest.TotalMilliseconds);
        }

        try
        {
            using var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            var html = await response.Content.ReadAsStringAsync();

            var document = await _context.OpenAsync(req => req
                .Address(url)
                .Content(html));

            _lastRequest = DateTime.Now;
            Console.WriteLine($"Fetched: {url}");

            // Diagnostics: some Alternate listing pages can look fine in the browser
            // but return unexpected markup to non-browser clients.
            if (url.Contains("/listing.xhtml", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var productLinks = document.QuerySelectorAll("a[href*='/html/product/']").Length;
                    Console.WriteLine($"[diag] listing productLinks={productLinks}");
                }
                catch
                {
                    // Ignore selector errors.
                }
            }

            return (document, html);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching {url}: {ex.Message}");
            return (null, string.Empty);
        }
    }

    public string? ExtractText(IDocument document, string selector)
    {
        return document.QuerySelector(selector)?.TextContent?.Trim();
    }

    public decimal ExtractPrice(string? priceText)
    {
        if (string.IsNullOrEmpty(priceText)) return 0;

        // Remove currency symbols and parse
        var cleaned = new string(priceText.Where(c => char.IsDigit(c) || c == '.' || c == ',').ToArray());
        cleaned = cleaned.Replace(',', '.');
        
        if (decimal.TryParse(cleaned, NumberStyles.Any, CultureInfo.InvariantCulture, out var price))
        {
            return price;
        }

        return 0;
    }
}
