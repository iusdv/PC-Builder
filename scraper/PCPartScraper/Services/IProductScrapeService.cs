using PCPartScraper.Models;

namespace PCPartScraper.Services;

public interface IProductScrapeService
{
    Task<ProductScrapeResult> SearchAndScrapeAsync(string query, CancellationToken cancellationToken = default);
}
