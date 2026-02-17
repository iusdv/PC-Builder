using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace PCPartPicker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class GamesController : ControllerBase
{
    private const string IgdbGamesEndpoint = "https://api.igdb.com/v4/games";
    private const string TwitchTokenEndpoint = "https://id.twitch.tv/oauth2/token";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GamesController> _logger;

    public GamesController(IHttpClientFactory httpClientFactory, ILogger<GamesController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    [HttpGet("catalog")]
    public async Task<ActionResult<IReadOnlyList<GameCatalogItemDto>>> GetCatalog(
        [FromQuery] int limit = 72,
        [FromQuery] int offset = 0,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 25, 500);
        offset = Math.Max(0, offset);

        var clientId = FirstNonEmptyEnv("IGDB_CLIENT_ID", "TWITCH_CLIENT_ID");
        var accessToken = await ResolveAccessTokenAsync(clientId, ct);

        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(accessToken))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message =
                    "Missing IGDB credentials. Set IGDB_CLIENT_ID (or TWITCH_CLIENT_ID) and either IGDB/TWITCH access token or TWITCH_CLIENT_SECRET."
            });
        }

        var requestBody = BuildIgdbQuery(limit, offset, search);
        var (statusCode, responseBody) = await SendIgdbRequestWithRefreshAsync(clientId, accessToken, requestBody, ct);

        if ((int)statusCode < 200 || (int)statusCode >= 300)
        {
            _logger.LogWarning(
                "IGDB catalog request failed with status {StatusCode}. Body: {Body}",
                (int)statusCode,
                responseBody);

            return StatusCode((int)statusCode, new
            {
                message = "IGDB request failed.",
                details = responseBody
            });
        }

        using var document = JsonDocument.Parse(responseBody);
        if (document.RootElement.ValueKind != JsonValueKind.Array)
        {
            return Ok(Array.Empty<GameCatalogItemDto>());
        }

        var games = new List<GameCatalogItemDto>(capacity: limit);

        foreach (var item in document.RootElement.EnumerateArray())
        {
            if (!TryGetString(item, "name", out var name) || string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            var igdbId = TryGetInt(item, "id");
            var slug = TryGetString(item, "slug", out var rawSlug) && !string.IsNullOrWhiteSpace(rawSlug)
                ? rawSlug
                : Slugify(name);

            var imagePath = ResolveCoverUrl(item);
            if (string.IsNullOrWhiteSpace(imagePath))
            {
                continue;
            }

            var sourceUrl = TryGetString(item, "url", out var url) && !string.IsNullOrWhiteSpace(url)
                ? url
                : null;

            games.Add(new GameCatalogItemDto
            {
                IgdbId = igdbId,
                Slug = slug,
                Name = name,
                ImagePath = imagePath,
                SourceUrl = sourceUrl,
                Genres = ResolveNameList(item, "genres"),
                Themes = ResolveNameList(item, "themes"),
                GameModes = ResolveNameList(item, "game_modes"),
                FirstReleaseDate = ResolveUnixDate(item, "first_release_date"),
                TotalRating = ResolveDouble(item, "total_rating"),
                TotalRatingCount = ResolveIntNullable(item, "total_rating_count"),
            });
        }

        return Ok(games);
    }

    [HttpGet("{igdbId:int}")]
    public async Task<ActionResult<GameDetailsDto>> GetGameDetails(int igdbId, CancellationToken ct = default)
    {
        if (igdbId <= 0)
        {
            return BadRequest(new { message = "A valid IGDB game id is required." });
        }

        var clientId = FirstNonEmptyEnv("IGDB_CLIENT_ID", "TWITCH_CLIENT_ID");
        var accessToken = await ResolveAccessTokenAsync(clientId, ct);
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(accessToken))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message =
                    "Missing IGDB credentials. Set IGDB_CLIENT_ID (or TWITCH_CLIENT_ID) and either IGDB/TWITCH access token or TWITCH_CLIENT_SECRET."
            });
        }

        var query =
            "fields id,name,slug,summary,storyline,url,total_rating,total_rating_count,first_release_date,cover.image_id,genres.name,themes.name,game_modes.name,player_perspectives.name,platforms.name,websites.category,websites.url,screenshots.image_id,artworks.image_id,involved_companies.developer,involved_companies.publisher,involved_companies.company.name;" +
            $"where id = {igdbId}; limit 1;";
        var (statusCode, body) = await SendIgdbRequestWithRefreshAsync(clientId, accessToken, query, ct);
        if ((int)statusCode < 200 || (int)statusCode >= 300)
        {
            _logger.LogWarning("IGDB game detail request failed with status {StatusCode}. Body: {Body}", (int)statusCode, body);
            return StatusCode((int)statusCode, new { message = "IGDB request failed.", details = body });
        }

        using var document = JsonDocument.Parse(body);
        if (document.RootElement.ValueKind != JsonValueKind.Array || document.RootElement.GetArrayLength() == 0)
        {
            return NotFound(new { message = $"No game found in IGDB for id {igdbId}." });
        }

        var game = document.RootElement[0];
        var dto = new GameDetailsDto
        {
            IgdbId = TryGetInt(game, "id"),
            Name = TryGetString(game, "name", out var name) ? name : "Unknown game",
            Slug = TryGetString(game, "slug", out var slug) ? slug : string.Empty,
            Summary = TryGetString(game, "summary", out var summary) ? summary : null,
            Storyline = TryGetString(game, "storyline", out var storyline) ? storyline : null,
            SourceUrl = TryGetString(game, "url", out var sourceUrl) ? sourceUrl : null,
            ImagePath = ResolveCoverUrl(game),
            Genres = ResolveNameList(game, "genres"),
            Themes = ResolveNameList(game, "themes"),
            GameModes = ResolveNameList(game, "game_modes"),
            PlayerPerspectives = ResolveNameList(game, "player_perspectives"),
            Platforms = ResolveNameList(game, "platforms"),
            Developers = ResolveCompanyList(game, "developer"),
            Publishers = ResolveCompanyList(game, "publisher"),
            Screenshots = ResolveImageList(game, "screenshots"),
            Artworks = ResolveImageList(game, "artworks"),
            Websites = ResolveWebsites(game),
            ReleaseDate = ResolveUnixDate(game, "first_release_date"),
            TotalRating = ResolveDouble(game, "total_rating"),
            TotalRatingCount = ResolveIntNullable(game, "total_rating_count"),
        };

        return Ok(dto);
    }

    private static string BuildIgdbQuery(int limit, int offset, string? search)
    {
        var fields =
            "fields id,name,slug,url,cover.url,cover.image_id,total_rating,total_rating_count,first_release_date,genres.name,themes.name,game_modes.name;";
        var wherePopular = "where cover != null;";
        var whereSearch = "where cover != null;";
        var sort = "sort total_rating_count desc;";
        var limitClause = $"limit {limit};";
        var offsetClause = $"offset {offset};";

        if (string.IsNullOrWhiteSpace(search))
        {
            return $"{fields}{wherePopular}{sort}{limitClause}{offsetClause}";
        }

        var escapedSearch = search.Trim().Replace("\\", "\\\\", StringComparison.Ordinal).Replace("\"", "\\\"", StringComparison.Ordinal);
        return $"{fields}search \"{escapedSearch}\";{whereSearch}{sort}{limitClause}{offsetClause}";
    }

    private static string? ResolveCoverUrl(JsonElement item)
    {
        if (!item.TryGetProperty("cover", out var cover) || cover.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (TryGetString(cover, "image_id", out var imageId) && !string.IsNullOrWhiteSpace(imageId))
        {
            return $"https://images.igdb.com/igdb/image/upload/t_cover_big/{imageId}.jpg";
        }

        if (!TryGetString(cover, "url", out var url) || string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        if (url.StartsWith("//", StringComparison.Ordinal))
        {
            url = $"https:{url}";
        }

        return url.Replace("/t_thumb/", "/t_cover_big/", StringComparison.Ordinal);
    }

    private static string Slugify(string value)
    {
        var sb = new StringBuilder(value.Length);
        var previousWasDash = false;

        foreach (var c in value.Normalize(NormalizationForm.FormD))
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(c);
            if (category == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            var lower = char.ToLowerInvariant(c);
            if (char.IsLetterOrDigit(lower))
            {
                sb.Append(lower);
                previousWasDash = false;
                continue;
            }

            if (!previousWasDash)
            {
                sb.Append('-');
                previousWasDash = true;
            }
        }

        return sb.ToString().Trim('-');
    }

    private static IReadOnlyList<string> ResolveNameList(JsonElement game, string propertyName)
    {
        if (!game.TryGetProperty(propertyName, out var value) || value.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }

        var list = new List<string>();
        foreach (var item in value.EnumerateArray())
        {
            if (TryGetString(item, "name", out var name) && !string.IsNullOrWhiteSpace(name))
            {
                list.Add(name);
            }
        }

        return list;
    }

    private static IReadOnlyList<string> ResolveCompanyList(JsonElement game, string roleProperty)
    {
        if (!game.TryGetProperty("involved_companies", out var value) || value.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }

        var list = new List<string>();
        foreach (var item in value.EnumerateArray())
        {
            if (!item.TryGetProperty(roleProperty, out var flag) || flag.ValueKind != JsonValueKind.True)
            {
                continue;
            }

            if (!item.TryGetProperty("company", out var company) || company.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            if (TryGetString(company, "name", out var name) && !string.IsNullOrWhiteSpace(name))
            {
                list.Add(name);
            }
        }

        return list;
    }

    private static IReadOnlyList<string> ResolveImageList(JsonElement game, string propertyName)
    {
        if (!game.TryGetProperty(propertyName, out var value) || value.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }

        var list = new List<string>();
        foreach (var item in value.EnumerateArray())
        {
            if (TryGetString(item, "image_id", out var imageId) && !string.IsNullOrWhiteSpace(imageId))
            {
                list.Add($"https://images.igdb.com/igdb/image/upload/t_screenshot_big/{imageId}.jpg");
            }
        }

        return list;
    }

    private static IReadOnlyList<GameWebsiteDto> ResolveWebsites(JsonElement game)
    {
        if (!game.TryGetProperty("websites", out var value) || value.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<GameWebsiteDto>();
        }

        var list = new List<GameWebsiteDto>();
        foreach (var item in value.EnumerateArray())
        {
            if (!TryGetString(item, "url", out var url) || string.IsNullOrWhiteSpace(url))
            {
                continue;
            }

            list.Add(new GameWebsiteDto
            {
                Url = url,
                Category = ResolveIntNullable(item, "category")
            });
        }

        return list;
    }

    private static DateTimeOffset? ResolveUnixDate(JsonElement item, string propertyName)
    {
        if (!item.TryGetProperty(propertyName, out var value) || value.ValueKind != JsonValueKind.Number)
        {
            return null;
        }

        if (!value.TryGetInt64(out var epoch))
        {
            return null;
        }

        return DateTimeOffset.FromUnixTimeSeconds(epoch);
    }

    private static int? ResolveIntNullable(JsonElement item, string propertyName)
    {
        return item.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var parsed)
            ? parsed
            : null;
    }

    private static double? ResolveDouble(JsonElement item, string propertyName)
    {
        return item.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var parsed)
            ? parsed
            : null;
    }

    private static string? FirstNonEmptyEnv(params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = Environment.GetEnvironmentVariable(key);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }

    private async Task<string?> ResolveAccessTokenAsync(string? clientId, CancellationToken ct, bool useConfiguredTokenFirst = true)
    {
        var explicitToken = FirstNonEmptyEnv("IGDB_ACCESS_TOKEN", "TWITCH_ACCESS_TOKEN", "TWITCH_TOKEN");
        if (useConfiguredTokenFirst && !string.IsNullOrWhiteSpace(explicitToken) && !ConfiguredTokenIsExpired())
        {
            return explicitToken;
        }

        var clientSecret = FirstNonEmptyEnv("TWITCH_CLIENT_SECRET", "IGDB_CLIENT_SECRET");
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
        {
            return null;
        }

        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, TwitchTokenEndpoint)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["grant_type"] = "client_credentials",
            })
        };

        using var response = await client.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Failed to acquire Twitch app token. Status {StatusCode}. Body: {Body}", (int)response.StatusCode, body);
            return !string.IsNullOrWhiteSpace(explicitToken) ? explicitToken : null;
        }

        using var doc = JsonDocument.Parse(body);
        if (TryGetString(doc.RootElement, "access_token", out var token) && !string.IsNullOrWhiteSpace(token))
        {
            return token;
        }

        return !string.IsNullOrWhiteSpace(explicitToken) ? explicitToken : null;
    }

    private async Task<(HttpStatusCode StatusCode, string Body)> SendIgdbRequestWithRefreshAsync(
        string clientId,
        string accessToken,
        string requestBody,
        CancellationToken ct)
    {
        var firstAttempt = await SendIgdbRequestAsync(clientId, accessToken, requestBody, ct);
        if (firstAttempt.StatusCode != HttpStatusCode.Unauthorized)
        {
            return firstAttempt;
        }

        var refreshedToken = await ResolveAccessTokenAsync(clientId, ct, useConfiguredTokenFirst: false);
        if (string.IsNullOrWhiteSpace(refreshedToken) || string.Equals(refreshedToken, accessToken, StringComparison.Ordinal))
        {
            return firstAttempt;
        }

        _logger.LogInformation("Retrying IGDB request once after refreshing app token.");
        return await SendIgdbRequestAsync(clientId, refreshedToken, requestBody, ct);
    }

    private async Task<(HttpStatusCode StatusCode, string Body)> SendIgdbRequestAsync(
        string clientId,
        string accessToken,
        string requestBody,
        CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, IgdbGamesEndpoint);
        request.Headers.Add("Client-ID", clientId);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Content = new StringContent(requestBody, Encoding.UTF8, "text/plain");

        var client = _httpClientFactory.CreateClient();
        using var response = await client.SendAsync(request, ct);
        var responseBody = await response.Content.ReadAsStringAsync(ct);
        return (response.StatusCode, responseBody);
    }

    private static bool ConfiguredTokenIsExpired()
    {
        var expiresAtRaw = FirstNonEmptyEnv("TWITCH_TOKEN_EXPIRES_AT", "IGDB_TOKEN_EXPIRES_AT");
        if (string.IsNullOrWhiteSpace(expiresAtRaw))
        {
            return false;
        }

        if (!DateTimeOffset.TryParse(
                expiresAtRaw,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var expiresAt))
        {
            return false;
        }

        return expiresAt <= DateTimeOffset.UtcNow.AddMinutes(1);
    }

    private static int TryGetInt(JsonElement item, string propertyName)
    {
        return item.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.Number && property.TryGetInt32(out var value)
            ? value
            : 0;
    }

    private static bool TryGetString(JsonElement item, string propertyName, out string value)
    {
        if (item.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.String)
        {
            value = property.GetString() ?? string.Empty;
            return true;
        }

        value = string.Empty;
        return false;
    }

    public sealed class GameCatalogItemDto
    {
        public int IgdbId { get; init; }
        public string Slug { get; init; } = string.Empty;
        public string Name { get; init; } = string.Empty;
        public string ImagePath { get; init; } = string.Empty;
        public string? SourceUrl { get; init; }
        public IReadOnlyList<string> Genres { get; init; } = Array.Empty<string>();
        public IReadOnlyList<string> Themes { get; init; } = Array.Empty<string>();
        public IReadOnlyList<string> GameModes { get; init; } = Array.Empty<string>();
        public DateTimeOffset? FirstReleaseDate { get; init; }
        public double? TotalRating { get; init; }
        public int? TotalRatingCount { get; init; }
    }

    public sealed class GameDetailsDto
    {
        public int IgdbId { get; init; }
        public string Name { get; init; } = string.Empty;
        public string Slug { get; init; } = string.Empty;
        public string? Summary { get; init; }
        public string? Storyline { get; init; }
        public string? ImagePath { get; init; }
        public string? SourceUrl { get; init; }
        public IReadOnlyList<string> Genres { get; init; } = Array.Empty<string>();
        public IReadOnlyList<string> Themes { get; init; } = Array.Empty<string>();
        public IReadOnlyList<string> GameModes { get; init; } = Array.Empty<string>();
        public IReadOnlyList<string> PlayerPerspectives { get; init; } = Array.Empty<string>();
        public IReadOnlyList<string> Platforms { get; init; } = Array.Empty<string>();
        public IReadOnlyList<string> Developers { get; init; } = Array.Empty<string>();
        public IReadOnlyList<string> Publishers { get; init; } = Array.Empty<string>();
        public IReadOnlyList<string> Screenshots { get; init; } = Array.Empty<string>();
        public IReadOnlyList<string> Artworks { get; init; } = Array.Empty<string>();
        public IReadOnlyList<GameWebsiteDto> Websites { get; init; } = Array.Empty<GameWebsiteDto>();
        public DateTimeOffset? ReleaseDate { get; init; }
        public double? TotalRating { get; init; }
        public int? TotalRatingCount { get; init; }
    }

    public sealed class GameWebsiteDto
    {
        public int? Category { get; init; }
        public string Url { get; init; } = string.Empty;
    }
}
