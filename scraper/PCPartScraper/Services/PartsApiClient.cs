using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using PCPartScraper.Models;

namespace PCPartScraper.Services;

public sealed class PartsApiClient
{
    private readonly HttpClient _http;

    public PartsApiClient(string baseUrl)
    {
        if (string.IsNullOrWhiteSpace(baseUrl)) throw new ArgumentException("Base URL is required.", nameof(baseUrl));

        _http = new HttpClient
        {
            BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/")
        };
        _http.DefaultRequestHeaders.Add("Accept", "application/json");
    }

    public async Task<List<PartSummaryDto>> GetAllPartsAsync(int pageSize = 200, CancellationToken cancellationToken = default)
    {
        var parts = new List<PartSummaryDto>();
        var page = 1;

        while (true)
        {
            var url = $"api/parts?page={page}&pageSize={pageSize}";
            var batch = await _http.GetFromJsonAsync<List<PartSummaryDto>>(url, cancellationToken) ?? new List<PartSummaryDto>();
            parts.AddRange(batch);

            if (batch.Count < pageSize) break;
            page++;
        }

        return parts;
    }

    public async Task<JsonNode?> GetPartDetailsAsJsonAsync(PartSummaryDto part, CancellationToken cancellationToken = default)
    {
        var categoryId = ParseCategory(part.Category);
        var endpoint = GetCategoryEndpoint(categoryId);
        var url = $"api/parts/{endpoint}/{part.Id}";

        using var response = await _http.GetAsync(url, cancellationToken);
        if (!response.IsSuccessStatusCode) return null;

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(json)) return null;

        return JsonNode.Parse(json);
    }

    public async Task<bool> PutPartDetailsJsonAsync(PartSummaryDto part, JsonNode body, CancellationToken cancellationToken = default)
    {
        var categoryId = ParseCategory(part.Category);
        var endpoint = GetCategoryEndpoint(categoryId);
        var url = $"api/parts/{endpoint}/{part.Id}";

        var json = body.ToJsonString(new JsonSerializerOptions { WriteIndented = false });
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var response = await _http.PutAsync(url, content, cancellationToken);
        if (response.IsSuccessStatusCode) return true;

        var detail = await SafeReadResponseAsync(response, cancellationToken);
        Console.WriteLine($"[api] PUT {url} -> {(int)response.StatusCode} {response.ReasonPhrase} {detail}");
        return false;
    }

    public async Task<bool> PostPartDetailsJsonAsync(int category, JsonNode body, CancellationToken cancellationToken = default)
    {
        var endpoint = GetCategoryEndpoint(category);
        var url = $"api/parts/{endpoint}";

        var json = body.ToJsonString(new JsonSerializerOptions { WriteIndented = false });
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var response = await _http.PostAsync(url, content, cancellationToken);
        if (response.IsSuccessStatusCode) return true;

        var detail = await SafeReadResponseAsync(response, cancellationToken);
        Console.WriteLine($"[api] POST {url} -> {(int)response.StatusCode} {response.ReasonPhrase} {detail}");
        return false;
    }

    private static async Task<string> SafeReadResponseAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        try
        {
            var text = await response.Content.ReadAsStringAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(text)) return string.Empty;
            text = text.Replace("\r", " ").Replace("\n", " ");
            return text.Length <= 400 ? text : text[..400] + "...";
        }
        catch
        {
            return string.Empty;
        }
    }

    public static string CategoryName(int category)
    {
        return category switch
        {
            0 => "CPU",
            1 => "Motherboard",
            2 => "RAM",
            3 => "GPU",
            4 => "Storage",
            5 => "PSU",
            6 => "Case",
            7 => "Cooler",
            _ => $"Unknown({category})"
        };
    }

    public static int ParseCategory(string? category)
    {
        var c = (category ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(c)) return -1;

        return c.ToUpperInvariant() switch
        {
            "CPU" => 0,
            "MOTHERBOARD" => 1,
            "RAM" => 2,
            "GPU" => 3,
            "STORAGE" => 4,
            "PSU" => 5,
            "CASE" => 6,
            "COOLER" => 7,
            _ => -1
        };
    }

    private static string GetCategoryEndpoint(int category)
    {
        return category switch
        {
            0 => "cpus",
            7 => "coolers",
            1 => "motherboards",
            2 => "rams",
            3 => "gpus",
            4 => "storages",
            5 => "psus",
            6 => "cases",
            _ => throw new InvalidOperationException($"Unsupported category '{category}'.")
        };
    }
}
