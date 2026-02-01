namespace PCPartScraper.Services;

public sealed class AsyncRateLimiter
{
    private readonly int _delayMs;
    private DateTime _last = DateTime.MinValue;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public AsyncRateLimiter(int delayMs)
    {
        _delayMs = delayMs;
    }

    public async Task WaitAsync(CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var elapsed = DateTime.UtcNow - _last;
            if (elapsed.TotalMilliseconds < _delayMs)
            {
                var remaining = _delayMs - (int)elapsed.TotalMilliseconds;
                if (remaining > 0)
                {
                    await Task.Delay(remaining, cancellationToken);
                }
            }

            _last = DateTime.UtcNow;
        }
        finally
        {
            _gate.Release();
        }
    }
}
