using PCPartScraper.Services;

namespace PCPartScraper;

class Program
{
    static async Task Main(string[] args)
    {
        var options = ParseArgs(args);

        Console.WriteLine(options.BulkImport ? "Parts Bulk Import Scraper" : (options.Repair ? "Parts Repair Scraper" : "Parts Enrichment Scraper"));
        Console.WriteLine("================================");
        Console.WriteLine($"API base: {options.ApiBaseUrl}");
        Console.WriteLine($"Delay:   {options.DelayMs} ms");
        Console.WriteLine($"Max:     {(options.BulkImport ? options.MaxCreates : options.MaxParts)}");
        Console.WriteLine($"Mode:    {(options.BulkImport ? (options.DryRun ? "bulk (dry-run)" : "bulk") : (options.OnlyMissing ? "only-missing" : "all"))}");
        Console.WriteLine($"Specs:   {(options.FillSpecs ? "on" : "off")}");
        Console.WriteLine("Source:  alternate.nl");
        Console.WriteLine("Scraper: http");
        if (options.BulkImport)
        {
            Console.WriteLine($"Cat:     {options.BulkCategory}");
            Console.WriteLine($"Pages:   {options.MaxPagesPerQuery}");
            Console.WriteLine($"Images:  {(options.VerifyImages ? "verify" : "trust")}");
        }
        else if (options.Repair)
        {
            Console.WriteLine($"Repair:  on ({options.RepairCategory})");
            Console.WriteLine($"Updates: {options.MaxUpdates}");
            Console.WriteLine($"Force:   {(options.ForceRepair ? "on" : "off")}");
        }
        Console.WriteLine();

        var api = new PartsApiClient(options.ApiBaseUrl);

        if (options.BulkImport)
        {
            // Bulk import currently supports Alternate.nl only.
            var rateLimited = new RateLimitedScraper(delayMilliseconds: options.DelayMs);
            var alternate = new AlternateScrapeService(rateLimited);
            var listing = new AlternateListingCrawler(rateLimited);

            var imageValidator = new ImageUrlValidator(new AsyncRateLimiter(Math.Max(250, options.DelayMs / 2)));

            var cachePath = Path.Combine(Directory.GetCurrentDirectory(), "output", "alternate-bulk-cache.json");
            var cache = new DiskJsonCache<PCPartScraper.Models.ProductScrapeResult>(cachePath);

            var runner = new AlternateBulkImportRunner(api, listing, alternate, cache, imageValidator);
            await runner.RunAsync(
                categories: ParseBulkCategories(options.BulkCategory),
                maxCreates: options.MaxCreates,
                maxPagesPerQuery: options.MaxPagesPerQuery,
                fillSpecs: options.FillSpecs,
                verifyImages: options.VerifyImages,
                dryRun: options.DryRun);
        }
        else if (options.Repair)
        {
            // Repair mode: re-scrape existing parts from Alternate and PUT updates.
            var rateLimited = new RateLimitedScraper(delayMilliseconds: options.DelayMs);
            var alternate = new AlternateScrapeService(rateLimited);

            var cachePath = Path.Combine(Directory.GetCurrentDirectory(), "output", "alternate-repair-cache.json");
            var cache = new DiskJsonCache<PCPartScraper.Models.ProductScrapeResult>(cachePath);

            var runner = new AlternateRepairRunner(api, alternate, cache);
            await runner.RunAsync(
                categories: ParseBulkCategories(options.RepairCategory),
                maxUpdates: options.MaxUpdates,
                fillSpecs: options.FillSpecs,
                dryRun: options.DryRun,
                forceRepair: options.ForceRepair);
        }
        else
        {
            var rateLimited = new RateLimitedScraper(delayMilliseconds: options.DelayMs);
            IProductScrapeService scraper = new AlternateScrapeService(rateLimited);

            var cachePath = Path.Combine(Directory.GetCurrentDirectory(), "output", "alternate-enrich-cache.json");
            var cache = new DiskJsonCache<PCPartScraper.Models.ProductScrapeResult>(cachePath);

            var runner = new PartsImageEnrichmentRunner(api, scraper, cache);
            await runner.RunAsync(options.MaxParts, options.OnlyMissing, options.FillSpecs);
        }
    }

    private sealed class CliOptions
    {
        public string ApiBaseUrl { get; set; } = "http://localhost:5144";
        public int DelayMs { get; set; } = 750;
        public int MaxParts { get; set; } = 50;
        public bool OnlyMissing { get; set; } = true;
        public bool FillSpecs { get; set; } = true;

        public bool Repair { get; set; } = false;
        public string RepairCategory { get; set; } = "cpu,storage";
        public int MaxUpdates { get; set; } = 200;
        public bool ForceRepair { get; set; } = false;

        public bool BulkImport { get; set; } = false;
        public string BulkCategory { get; set; } = "all";
        public int MaxCreates { get; set; } = 100;
        public int MaxPagesPerQuery { get; set; } = 2;
        public bool DryRun { get; set; } = false;
        public bool VerifyImages { get; set; } = true;
    }

    private static CliOptions ParseArgs(string[] args)
    {
        var o = new CliOptions();

        for (var i = 0; i < args.Length; i++)
        {
            var a = args[i];
            switch (a)
            {
                case "--apiBase":
                    o.ApiBaseUrl = NextValue(args, ref i);
                    break;
                case "--delayMs":
                    o.DelayMs = int.TryParse(NextValue(args, ref i), out var d) ? d : o.DelayMs;
                    break;
                case "--max":
                    o.MaxParts = int.TryParse(NextValue(args, ref i), out var m) ? m : o.MaxParts;
                    break;
                case "--all":
                    o.OnlyMissing = false;
                    break;
                case "--onlyMissing":
                    o.OnlyMissing = true;
                    break;
                case "--bulk":
                    o.BulkImport = true;
                    break;
                case "--repair":
                    o.Repair = true;
                    break;
                case "--category":
                    o.BulkCategory = NextValue(args, ref i);
                    break;
                case "--repairCategory":
                    o.RepairCategory = NextValue(args, ref i);
                    break;
                case "--maxCreates":
                    o.MaxCreates = int.TryParse(NextValue(args, ref i), out var c) ? c : o.MaxCreates;
                    break;
                case "--maxUpdates":
                    o.MaxUpdates = int.TryParse(NextValue(args, ref i), out var u) ? u : o.MaxUpdates;
                    break;
                case "--forceRepair":
                    o.ForceRepair = true;
                    break;
                case "--maxPages":
                    o.MaxPagesPerQuery = int.TryParse(NextValue(args, ref i), out var p) ? p : o.MaxPagesPerQuery;
                    break;
                case "--dryRun":
                    o.DryRun = true;
                    break;
                case "--verifyImages":
                    o.VerifyImages = true;
                    break;
                case "--noVerifyImages":
                    o.VerifyImages = false;
                    break;
                case "--noSpecs":
                    o.FillSpecs = false;
                    break;
                case "--help":
                case "-h":
                    PrintHelp();
                    Environment.Exit(0);
                    break;
            }
        }

        if (o.DelayMs < 250) o.DelayMs = 250;
        if (o.MaxParts < 1) o.MaxParts = 1;
        if (o.MaxCreates < 1) o.MaxCreates = 1;
        if (o.MaxPagesPerQuery < 1) o.MaxPagesPerQuery = 1;
        if (o.MaxUpdates < 1) o.MaxUpdates = 1;
        return o;
    }

    private static IReadOnlyList<int> ParseBulkCategories(string? bulkCategory)
    {
        var c = (bulkCategory ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(c) || c == "all") return new[] { 0, 1, 2, 3, 4, 5, 6, 7, 8 };

        if (c.Contains(',', StringComparison.OrdinalIgnoreCase))
        {
            var set = new HashSet<int>();
            foreach (var token in c.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                foreach (var cat in ParseBulkCategories(token)) set.Add(cat);
            }
            return set.Count == 0 ? new[] { 0, 1, 2, 3, 4, 5, 6, 7, 8 } : set.OrderBy(x => x).ToArray();
        }

        return c switch
        {
            "cpu" or "cpus" => new[] { 0 },
            "motherboard" or "motherboards" or "mobo" => new[] { 1 },
            "ram" or "memory" => new[] { 2 },
            "gpu" or "gpus" => new[] { 3 },
            "storage" or "ssd" or "hdd" => new[] { 4 },
            "psu" or "psus" => new[] { 5 },
            "case" or "cases" => new[] { 6 },
            "cooler" or "coolers" => new[] { 7 },
            "casefan" or "casefans" or "case-fan" or "case fan" => new[] { 8 },
            _ => new[] { 0, 1, 2, 3, 4, 5, 6, 7, 8 }
        };
    }

    private static string NextValue(string[] args, ref int i)
    {
        if (i + 1 >= args.Length) return string.Empty;
        i++;
        return args[i];
    }

    private static void PrintHelp()
    {
        Console.WriteLine("Usage:");
        Console.WriteLine("  dotnet run --project scraper/PCPartScraper -- --apiBase http://localhost:5144 --delayMs 1500 --max 50 --onlyMissing");
        Console.WriteLine("  dotnet run --project scraper/PCPartScraper -- --bulk --category all --maxCreates 200 --maxPages 3 --delayMs 750");
        Console.WriteLine("  dotnet run --project scraper/PCPartScraper -- --repair --repairCategory cpu,storage,case --maxUpdates 500 --delayMs 750");
        Console.WriteLine();
        Console.WriteLine("Options:");
        Console.WriteLine("  --apiBase <url>   Base URL of the API (default: http://localhost:5144)");
        Console.WriteLine("  --delayMs <int>   Delay between web requests (default: 750)");
        Console.WriteLine("  --max <int>       Max parts to process this run (default: 50)");
        Console.WriteLine("  --bulk            Bulk import mode (Alternate.nl only; creates new parts)");
        Console.WriteLine("  --category <str>  Bulk import category: cpu|motherboard|ram|gpu|storage|psu|case|cooler|casefan|all (default: all)");
        Console.WriteLine("  --maxCreates <n>  Bulk import: max creates this run (default: 100)");
        Console.WriteLine("  --maxPages <n>    Bulk import: max listing pages per query (default: 2)");
        Console.WriteLine("  --repair          Repair mode (Alternate.nl only; updates existing parts)");
        Console.WriteLine("  --repairCategory  Repair categories: cpu,storage,case (default: cpu,storage)");
        Console.WriteLine("  --maxUpdates <n>  Repair mode: max updates this run (default: 200)");
        Console.WriteLine("  --forceRepair     Repair mode: allow overwriting existing values (opt-in)");
        Console.WriteLine("  --dryRun          Bulk import: don't POST to API (just simulate)");
        Console.WriteLine("  --verifyImages    Bulk import: verify image URLs return an image (default)");
        Console.WriteLine("  --noVerifyImages  Bulk import: skip image URL verification (faster)");
        Console.WriteLine("  --onlyMissing     Only fill missing imageUrl/productUrl (default)");
        Console.WriteLine("  --all             Re-scrape everything (won't overwrite non-empty fields)");
        Console.WriteLine("  --noSpecs         Do not attempt to parse & fill category-specific spec fields");
    }
}
