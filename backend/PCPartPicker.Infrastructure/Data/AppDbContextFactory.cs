using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PCPartPicker.Infrastructure.Data;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        
        // Use server version for design-time
        var connectionString = "Server=localhost;Database=pcpartpicker;User=root;Password=password;";
        optionsBuilder.UseMySQL(connectionString);
        
        return new AppDbContext(optionsBuilder.Options);
    }
}
