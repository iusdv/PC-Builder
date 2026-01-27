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

    public RateLimitedScraper(int delayMilliseconds = 2000)
    {
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        _delayMs = delayMilliseconds;
        
        var config = Configuration.Default.WithDefaultLoader();
        _context = BrowsingContext.New(config);
    }

    public async Task<IDocument?> GetDocumentAsync(string url)
    {
        // Rate limiting
        var timeSinceLastRequest = DateTime.Now - _lastRequest;
        if (timeSinceLastRequest.TotalMilliseconds < _delayMs)
        {
            await Task.Delay(_delayMs - (int)timeSinceLastRequest.TotalMilliseconds);
        }

        try
        {
            var document = await _context.OpenAsync(url);
            _lastRequest = DateTime.Now;
            Console.WriteLine($"Fetched: {url}");
            return document;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching {url}: {ex.Message}");
            return null;
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
