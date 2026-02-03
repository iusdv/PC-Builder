using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PCPartPicker.Infrastructure.Identity;

public sealed class RefreshToken
{
    public Guid Id { get; set; }

    [Required]
    public string UserId { get; set; } = string.Empty;

    // SHA-256 hex string
    [Required]
    [MaxLength(64)]
    public string TokenHash { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }
    public string? CreatedByIp { get; set; }
    public string? RevokedByIp { get; set; }

    public Guid? ReplacedByTokenId { get; set; }

    [NotMapped]
    public bool IsExpired => DateTimeOffset.UtcNow >= ExpiresAt;

    [NotMapped]
    public bool IsActive => RevokedAt is null && !IsExpired;
}
