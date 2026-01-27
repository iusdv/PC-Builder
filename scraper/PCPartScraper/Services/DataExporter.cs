using System.Globalization;
using System.Text.Json;
using CsvHelper;
using PCPartScraper.Models;

namespace PCPartScraper.Services;

public class DataExporter
{
    public static async Task ExportToCsvAsync(List<PartData> parts, string filePath)
    {
        using var writer = new StreamWriter(filePath);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
        
        await csv.WriteRecordsAsync(parts);
        Console.WriteLine($"Exported {parts.Count} parts to {filePath}");
    }

    public static async Task ExportToJsonAsync(List<PartData> parts, string filePath)
    {
        var options = new JsonSerializerOptions { WriteIndented = true };
        var json = JsonSerializer.Serialize(parts, options);
        
        await File.WriteAllTextAsync(filePath, json);
        Console.WriteLine($"Exported {parts.Count} parts to {filePath}");
    }
}
