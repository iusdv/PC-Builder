using PCPartScraper.Models;
using PCPartScraper.Services;

namespace PCPartScraper;

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("PC Part Scraper - Example Implementation");
        Console.WriteLine("==========================================");
        Console.WriteLine();
        Console.WriteLine("This is a template scraper for personal data collection.");
        Console.WriteLine("Configure it to scrape from allowed websites for your own use.");
        Console.WriteLine();

        // Example: Scrape mock data
        var scraper = new RateLimitedScraper(delayMilliseconds: 2000);
        var parts = new List<PartData>();

        // IMPORTANT: Replace with actual scraping logic for allowed websites
        // This is just a demonstration
        Console.WriteLine("Note: Add your scraping logic here.");
        Console.WriteLine("Example: Configure selectors for product pages you're allowed to scrape.");
        Console.WriteLine();

        // Create sample data for demonstration
        parts.Add(new PartData
        {
            Name = "AMD Ryzen 9 7950X",
            Manufacturer = "AMD",
            Price = 699.99m,
            Wattage = 170,
            Category = "CPU",
            Specs = new Dictionary<string, string>
            {
                { "Socket", "AM5" },
                { "Cores", "16" },
                { "Threads", "32" }
            }
        });

        parts.Add(new PartData
        {
            Name = "ASUS ROG Strix X670E-E",
            Manufacturer = "ASUS",
            Price = 449.99m,
            Wattage = 50,
            Category = "Motherboard",
            Specs = new Dictionary<string, string>
            {
                { "Socket", "AM5" },
                { "FormFactor", "ATX" },
                { "MemoryType", "DDR5" }
            }
        });

        Console.WriteLine($"Generated {parts.Count} sample parts");

        // Export options
        var outputDir = Path.Combine(Directory.GetCurrentDirectory(), "output");
        Directory.CreateDirectory(outputDir);

        var csvPath = Path.Combine(outputDir, "parts.csv");
        var jsonPath = Path.Combine(outputDir, "parts.json");

        await DataExporter.ExportToCsvAsync(parts, csvPath);
        await DataExporter.ExportToJsonAsync(parts, jsonPath);

        Console.WriteLine();
        Console.WriteLine("Scraping complete!");
        Console.WriteLine($"Output directory: {outputDir}");
    }
}
