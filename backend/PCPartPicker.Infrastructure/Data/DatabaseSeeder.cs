using PCPartPicker.Domain.Entities;
using PCPartPicker.Domain.Enums;

namespace PCPartPicker.Infrastructure.Data;

public static class DatabaseSeeder
{
    public static void SeedData(ApplicationDbContext context)
    {
        // Check if data already exists
        if (context.CPUs.Any() || context.Motherboards.Any())
        {
            return;
        }

        // Seed CPUs
        var cpus = new List<CPU>
        {
            new CPU
            {
                Name = "AMD Ryzen 9 7950X",
                Manufacturer = "AMD",
                Price = 699.99m,
                Wattage = 170,
                Socket = SocketType.AM5,
                CoreCount = 16,
                ThreadCount = 32,
                BaseClock = 4.5m,
                BoostClock = 5.7m,
                IntegratedGraphics = true
            },
            new CPU
            {
                Name = "Intel Core i9-14900K",
                Manufacturer = "Intel",
                Price = 589.99m,
                Wattage = 253,
                Socket = SocketType.LGA1700,
                CoreCount = 24,
                ThreadCount = 32,
                BaseClock = 3.2m,
                BoostClock = 6.0m,
                IntegratedGraphics = true
            },
            new CPU
            {
                Name = "AMD Ryzen 7 7800X3D",
                Manufacturer = "AMD",
                Price = 449.99m,
                Wattage = 120,
                Socket = SocketType.AM5,
                CoreCount = 8,
                ThreadCount = 16,
                BaseClock = 4.2m,
                BoostClock = 5.0m,
                IntegratedGraphics = true
            },
            new CPU
            {
                Name = "Intel Core i5-14600K",
                Manufacturer = "Intel",
                Price = 319.99m,
                Wattage = 181,
                Socket = SocketType.LGA1700,
                CoreCount = 14,
                ThreadCount = 20,
                BaseClock = 3.5m,
                BoostClock = 5.3m,
                IntegratedGraphics = true
            }
        };

        // Seed Motherboards
        var motherboards = new List<Motherboard>
        {
            new Motherboard
            {
                Name = "ASUS ROG Strix X670E-E Gaming WiFi",
                Manufacturer = "ASUS",
                Price = 499.99m,
                Wattage = 50,
                Socket = SocketType.AM5,
                Chipset = "X670E",
                FormFactor = FormFactor.ATX,
                MemoryType = RAMType.DDR5,
                MemorySlots = 4,
                MaxMemoryGB = 128,
                PCIeSlots = 3,
                M2Slots = 4,
                SataSlots = 6
            },
            new Motherboard
            {
                Name = "MSI MPG Z790 EDGE WIFI",
                Manufacturer = "MSI",
                Price = 399.99m,
                Wattage = 50,
                Socket = SocketType.LGA1700,
                Chipset = "Z790",
                FormFactor = FormFactor.ATX,
                MemoryType = RAMType.DDR5,
                MemorySlots = 4,
                MaxMemoryGB = 192,
                PCIeSlots = 3,
                M2Slots = 5,
                SataSlots = 4
            },
            new Motherboard
            {
                Name = "Gigabyte B650 AORUS ELITE AX",
                Manufacturer = "Gigabyte",
                Price = 229.99m,
                Wattage = 45,
                Socket = SocketType.AM5,
                Chipset = "B650",
                FormFactor = FormFactor.ATX,
                MemoryType = RAMType.DDR5,
                MemorySlots = 4,
                MaxMemoryGB = 128,
                PCIeSlots = 2,
                M2Slots = 3,
                SataSlots = 4
            },
            new Motherboard
            {
                Name = "ASRock B760M Pro RS",
                Manufacturer = "ASRock",
                Price = 129.99m,
                Wattage = 40,
                Socket = SocketType.LGA1700,
                Chipset = "B760",
                FormFactor = FormFactor.MicroATX,
                MemoryType = RAMType.DDR5,
                MemorySlots = 4,
                MaxMemoryGB = 128,
                PCIeSlots = 2,
                M2Slots = 2,
                SataSlots = 4
            }
        };

        // Seed RAM
        var rams = new List<RAM>
        {
            new RAM
            {
                Name = "Corsair Vengeance DDR5 32GB (2x16GB)",
                Manufacturer = "Corsair",
                Price = 139.99m,
                Wattage = 10,
                Type = RAMType.DDR5,
                SpeedMHz = 6000,
                CapacityGB = 32,
                ModuleCount = 2,
                CASLatency = 36
            },
            new RAM
            {
                Name = "G.Skill Trident Z5 RGB 32GB (2x16GB)",
                Manufacturer = "G.Skill",
                Price = 159.99m,
                Wattage = 10,
                Type = RAMType.DDR5,
                SpeedMHz = 6400,
                CapacityGB = 32,
                ModuleCount = 2,
                CASLatency = 32
            }
        };

        // Seed GPUs
        var gpus = new List<GPU>
        {
            new GPU
            {
                Name = "NVIDIA GeForce RTX 4090",
                Manufacturer = "NVIDIA",
                Price = 1599.99m,
                Wattage = 450,
                Chipset = "AD102",
                MemoryGB = 24,
                MemoryType = "GDDR6X",
                CoreClock = 2235,
                BoostClock = 2520,
                Length = 304,
                Slots = 3
            },
            new GPU
            {
                Name = "AMD Radeon RX 7900 XTX",
                Manufacturer = "AMD",
                Price = 999.99m,
                Wattage = 355,
                Chipset = "Navi 31",
                MemoryGB = 24,
                MemoryType = "GDDR6",
                CoreClock = 2300,
                BoostClock = 2500,
                Length = 287,
                Slots = 3
            }
        };

        // Seed Storage
        var storages = new List<Storage>
        {
            new Storage
            {
                Name = "Samsung 990 Pro 2TB",
                Manufacturer = "Samsung",
                Price = 199.99m,
                Wattage = 7,
                Type = "NVMe SSD",
                CapacityGB = 2000,
                Interface = "M.2 NVMe",
                ReadSpeedMBps = 7450,
                WriteSpeedMBps = 6900
            },
            new Storage
            {
                Name = "WD Black SN850X 1TB",
                Manufacturer = "Western Digital",
                Price = 119.99m,
                Wattage = 6,
                Type = "NVMe SSD",
                CapacityGB = 1000,
                Interface = "M.2 NVMe",
                ReadSpeedMBps = 7300,
                WriteSpeedMBps = 6300
            }
        };

        // Seed PSUs
        var psus = new List<PSU>
        {
            new PSU
            {
                Name = "Corsair RM1000x",
                Manufacturer = "Corsair",
                Price = 189.99m,
                Wattage = 0,
                WattageRating = 1000,
                Efficiency = "80+ Gold",
                Modular = true,
                FormFactor = FormFactor.ATX
            },
            new PSU
            {
                Name = "Seasonic FOCUS GX-850",
                Manufacturer = "Seasonic",
                Price = 139.99m,
                Wattage = 0,
                WattageRating = 850,
                Efficiency = "80+ Gold",
                Modular = true,
                FormFactor = FormFactor.ATX
            }
        };

        // Seed Cases
        var cases = new List<Case>
        {
            new Case
            {
                Name = "Lian Li O11 Dynamic EVO",
                Manufacturer = "Lian Li",
                Price = 159.99m,
                Wattage = 0,
                FormFactor = FormFactor.ATX,
                MaxGPULength = 420,
                Color = "Black",
                HasSidePanel = true
            },
            new Case
            {
                Name = "Fractal Design Meshify 2",
                Manufacturer = "Fractal Design",
                Price = 129.99m,
                Wattage = 0,
                FormFactor = FormFactor.ATX,
                MaxGPULength = 360,
                Color = "Black",
                HasSidePanel = true
            }
        };

        // Add all to context
        context.CPUs.AddRange(cpus);
        context.Motherboards.AddRange(motherboards);
        context.RAMs.AddRange(rams);
        context.GPUs.AddRange(gpus);
        context.Storages.AddRange(storages);
        context.PSUs.AddRange(psus);
        context.Cases.AddRange(cases);

        context.SaveChanges();
    }
}
