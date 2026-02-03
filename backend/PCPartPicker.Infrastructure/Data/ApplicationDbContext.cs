using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PCPartPicker.Domain.Entities;
using PCPartPicker.Infrastructure.Identity;
using System;

namespace PCPartPicker.Infrastructure.Data;

public class ApplicationDbContext : IdentityUserContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<RefreshToken> RefreshTokens { get; set; }

    public DbSet<CPU> CPUs { get; set; }
    public DbSet<Cooler> Coolers { get; set; }
    public DbSet<Motherboard> Motherboards { get; set; }
    public DbSet<RAM> RAMs { get; set; }
    public DbSet<GPU> GPUs { get; set; }
    public DbSet<Storage> Storages { get; set; }
    public DbSet<PSU> PSUs { get; set; }
    public DbSet<Case> Cases { get; set; }
    public DbSet<CaseFan> CaseFans { get; set; }
    public DbSet<Build> Builds { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Keep indexed identity columns <= 191 chars for utf8mb4.
        modelBuilder.Entity<ApplicationUser>(b =>
        {
            b.ToTable("Users");
            b.Property(u => u.Id).HasMaxLength(36);
            b.Property(u => u.UserName).HasMaxLength(191);
            b.Property(u => u.NormalizedUserName).HasMaxLength(191);
            b.Property(u => u.Email).HasMaxLength(191);
            b.Property(u => u.NormalizedEmail).HasMaxLength(191);

            b.Property(u => u.Role)
                .HasMaxLength(16)
                .HasDefaultValue("user");
        });

        modelBuilder.Entity<IdentityUserClaim<string>>(b =>
        {
            b.ToTable("UserClaims");
            b.Property(uc => uc.UserId).HasMaxLength(36);
        });

        modelBuilder.Entity<IdentityUserToken<string>>(b =>
        {
            b.ToTable("UserTokens");
            b.Property(t => t.LoginProvider).HasMaxLength(128);
            b.Property(t => t.Name).HasMaxLength(128);
            b.Property(t => t.UserId).HasMaxLength(36);
        });

        modelBuilder.Ignore<IdentityUserLogin<string>>();

        var buildOwnershipEnabled = IsBuildOwnershipEnabled();

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(rt => rt.Id);
            entity.Property(rt => rt.TokenHash).HasMaxLength(64).IsRequired();
            entity.Property(rt => rt.UserId).IsRequired();
        });

        // Configure TPH (Table Per Hierarchy) for Part entities
        modelBuilder.Entity<Part>()
            .HasDiscriminator<string>("Discriminator")
            .HasValue<CPU>("CPU")
            .HasValue<Cooler>("Cooler")
            .HasValue<Motherboard>("Motherboard")
            .HasValue<RAM>("RAM")
            .HasValue<GPU>("GPU")
            .HasValue<Storage>("Storage")
            .HasValue<PSU>("PSU")
            .HasValue<Case>("Case")
            .HasValue<CaseFan>("CaseFan");

        // Configure decimal precision for prices
        modelBuilder.Entity<Part>()
            .Property(p => p.Price)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Build>()
            .Property(b => b.TotalPrice)
            .HasPrecision(18, 2);

        // Configure CPU
        modelBuilder.Entity<CPU>()
            .Property(c => c.BaseClock)
            .HasPrecision(5, 2);

        modelBuilder.Entity<CPU>()
            .Property(c => c.BoostClock)
            .HasPrecision(5, 2);

        // Configure ShareCode as unique
        modelBuilder.Entity<Build>()
            .HasIndex(b => b.ShareCode)
            .IsUnique();

        if (!buildOwnershipEnabled)
        {
            modelBuilder.Entity<Build>().Ignore(b => b.UserId);
        }

        // Configure relationships for Build
        modelBuilder.Entity<Build>()
            .HasOne(b => b.CPU)
            .WithMany()
            .HasForeignKey(b => b.CPUId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Build>()
            .HasOne(b => b.Cooler)
            .WithMany()
            .HasForeignKey(b => b.CoolerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Build>()
            .HasOne(b => b.Motherboard)
            .WithMany()
            .HasForeignKey(b => b.MotherboardId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Build>()
            .HasOne(b => b.RAM)
            .WithMany()
            .HasForeignKey(b => b.RAMId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Build>()
            .HasOne(b => b.GPU)
            .WithMany()
            .HasForeignKey(b => b.GPUId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Build>()
            .HasOne(b => b.Storage)
            .WithMany()
            .HasForeignKey(b => b.StorageId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Build>()
            .HasOne(b => b.PSU)
            .WithMany()
            .HasForeignKey(b => b.PSUId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Build>()
            .HasOne(b => b.Case)
            .WithMany()
            .HasForeignKey(b => b.CaseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Build>()
            .HasOne(b => b.CaseFan)
            .WithMany()
            .HasForeignKey(b => b.CaseFanId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static bool IsBuildOwnershipEnabled()
    {
        var raw = Environment.GetEnvironmentVariable("FEATURE_BUILD_OWNERSHIP");
        if (!string.IsNullOrWhiteSpace(raw))
        {
            return string.Equals(raw, "true", StringComparison.OrdinalIgnoreCase);
        }

        var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        return string.Equals(env, "Development", StringComparison.OrdinalIgnoreCase);
    }
}
