using System.Text.Json;

namespace PCPartScraper.Services;

public sealed class DiskJsonCache<TValue>
{
    private readonly string _filePath;
    private readonly Dictionary<string, TValue> _items;

    public DiskJsonCache(string filePath)
    {
        _filePath = filePath;
        _items = Load(filePath);
    }

    public bool TryGet(string key, out TValue value) => _items.TryGetValue(key, out value!);

    public void Set(string key, TValue value) => _items[key] = value;

    public async Task SaveAsync(CancellationToken cancellationToken = default)
    {
        var dir = Path.GetDirectoryName(_filePath);
        if (!string.IsNullOrWhiteSpace(dir))
        {
            Directory.CreateDirectory(dir);
        }

        var options = new JsonSerializerOptions
        {
            WriteIndented = true
        };

        var json = JsonSerializer.Serialize(_items, options);
        await File.WriteAllTextAsync(_filePath, json, cancellationToken);
    }

    private static Dictionary<string, TValue> Load(string filePath)
    {
        try
        {
            if (!File.Exists(filePath)) return new Dictionary<string, TValue>(StringComparer.OrdinalIgnoreCase);
            var json = File.ReadAllText(filePath);
            if (string.IsNullOrWhiteSpace(json)) return new Dictionary<string, TValue>(StringComparer.OrdinalIgnoreCase);

            var parsed = JsonSerializer.Deserialize<Dictionary<string, TValue>>(json);
            return parsed == null
                ? new Dictionary<string, TValue>(StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, TValue>(parsed, StringComparer.OrdinalIgnoreCase);
        }
        catch
        {
            return new Dictionary<string, TValue>(StringComparer.OrdinalIgnoreCase);
        }
    }
}
