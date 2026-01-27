using Microsoft.EntityFrameworkCore;
using PCPartPicker.Domain.Entities;

namespace PCPartPicker.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<PCPart> PCParts { get; set; }
    public DbSet<Build> Builds { get; set; }
    public DbSet<BuildPart> BuildParts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<PCPart>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Price).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Build>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ShareToken).IsUnique();
            entity.Property(e => e.TotalPrice).HasPrecision(18, 2);
            entity.HasOne(e => e.User)
                .WithMany(u => u.Builds)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BuildPart>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Build)
                .WithMany(b => b.BuildParts)
                .HasForeignKey(e => e.BuildId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.PCPart)
                .WithMany(p => p.BuildParts)
                .HasForeignKey(e => e.PCPartId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
