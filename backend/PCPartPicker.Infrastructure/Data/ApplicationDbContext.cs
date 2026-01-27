using Microsoft.EntityFrameworkCore;
using PCPartPicker.Domain.Entities;

namespace PCPartPicker.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<CPU> CPUs { get; set; }
    public DbSet<Motherboard> Motherboards { get; set; }
    public DbSet<RAM> RAMs { get; set; }
    public DbSet<GPU> GPUs { get; set; }
    public DbSet<Storage> Storages { get; set; }
    public DbSet<PSU> PSUs { get; set; }
    public DbSet<Case> Cases { get; set; }
    public DbSet<Build> Builds { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure TPH (Table Per Hierarchy) for Part entities
        modelBuilder.Entity<Part>()
            .HasDiscriminator<string>("Discriminator")
            .HasValue<CPU>("CPU")
            .HasValue<Motherboard>("Motherboard")
            .HasValue<RAM>("RAM")
            .HasValue<GPU>("GPU")
            .HasValue<Storage>("Storage")
            .HasValue<PSU>("PSU")
            .HasValue<Case>("Case");

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

        // Configure relationships for Build
        modelBuilder.Entity<Build>()
            .HasOne(b => b.CPU)
            .WithMany()
            .HasForeignKey(b => b.CPUId)
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
    }
}
