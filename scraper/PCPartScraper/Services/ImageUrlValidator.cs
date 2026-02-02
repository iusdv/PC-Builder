using System.Net;

namespace PCPartScraper.Services;

public sealed class ImageUrlValidator
{
    private readonly HttpClient _http;
    private readonly AsyncRateLimiter _limiter;

    public ImageUrlValidator(AsyncRateLimiter limiter, TimeSpan? timeout = null)
    {
        _limiter = limiter;
        _http = new HttpClient
        {
            Timeout = timeout ?? TimeSpan.FromSeconds(10)
        };
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("PCPartScraper/1.0 (+local dev; respectful; image-check)");
        _http.DefaultRequestHeaders.Accept.ParseAdd("image/avif,image/webp,image/apng,image/*,*/*;q=0.8");
    }

    public async Task<bool> IsWorkingImageAsync(string? imageUrl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return false;

        var url = imageUrl.Trim();

        // 1) Prefer HEAD (cheap) when supported.
        var headOk = await TryHeadAsync(url, cancellationToken);
        if (headOk.HasValue) return headOk.Value;

        // 2) Fallback to a minimal GET (headers only).
        return await TryGetHeadersAsync(url, cancellationToken);
    }

    private async Task<bool?> TryHeadAsync(string url, CancellationToken cancellationToken)
    {
        try
        {
            await _limiter.WaitAsync(cancellationToken);

            using var req = new HttpRequestMessage(HttpMethod.Head, url);
            using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

            // Some servers return 405 for HEAD; treat as "not supported" and fall back.
            if (resp.StatusCode == HttpStatusCode.MethodNotAllowed || resp.StatusCode == HttpStatusCode.NotImplemented)
            {
                return null;
            }

            if (!resp.IsSuccessStatusCode) return false;
            return LooksLikeImageResponse(resp, url);
        }
        catch
        {
            // Network errors shouldn't block bulk import; treat as unknown and fall back to GET.
            return null;
        }
    }

    private async Task<bool> TryGetHeadersAsync(string url, CancellationToken cancellationToken)
    {
        try
        {
            await _limiter.WaitAsync(cancellationToken);

            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Range = new System.Net.Http.Headers.RangeHeaderValue(0, 0);

            using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (!resp.IsSuccessStatusCode) return false;

            return LooksLikeImageResponse(resp, url);
        }
        catch
        {
            return false;
        }
    }

    private static bool LooksLikeImageResponse(HttpResponseMessage resp, string url)
    {
        var mediaType = resp.Content.Headers.ContentType?.MediaType;
        if (!string.IsNullOrWhiteSpace(mediaType) && mediaType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // Some CDNs respond without a proper Content-Type; allow common extensions.
        var lower = url.ToLowerInvariant();
        return lower.Contains(".jpg") || lower.Contains(".jpeg") || lower.Contains(".png") || lower.Contains(".webp") || lower.Contains(".avif");
    }
}
