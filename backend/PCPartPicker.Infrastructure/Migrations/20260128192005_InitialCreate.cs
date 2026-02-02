using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PCPartPicker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Part",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Manufacturer = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Price = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ImageUrl = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Category = table.Column<int>(type: "int", nullable: false),
                    Wattage = table.Column<int>(type: "int", nullable: true),
                    ProductUrl = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Discriminator = table.Column<string>(type: "varchar(13)", maxLength: 13, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CoolerType = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Cooler_Socket = table.Column<int>(type: "int", nullable: true),
                    HeightMM = table.Column<int>(type: "int", nullable: true),
                    RadiatorSizeMM = table.Column<int>(type: "int", nullable: true),
                    CPU_Socket = table.Column<int>(type: "int", nullable: true),
                    CoreCount = table.Column<int>(type: "int", nullable: true),
                    ThreadCount = table.Column<int>(type: "int", nullable: true),
                    BaseClock = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    CPU_BoostClock = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    IntegratedGraphics = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    Case_FormFactor = table.Column<int>(type: "int", nullable: true),
                    MaxGPULength = table.Column<int>(type: "int", nullable: true),
                    Color = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    HasSidePanel = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    GPU_Chipset = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MemoryGB = table.Column<int>(type: "int", nullable: true),
                    GPU_MemoryType = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CoreClock = table.Column<int>(type: "int", nullable: true),
                    BoostClock = table.Column<int>(type: "int", nullable: true),
                    Length = table.Column<int>(type: "int", nullable: true),
                    Slots = table.Column<int>(type: "int", nullable: true),
                    Socket = table.Column<int>(type: "int", nullable: true),
                    Chipset = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Motherboard_FormFactor = table.Column<int>(type: "int", nullable: true),
                    MemoryType = table.Column<int>(type: "int", nullable: true),
                    MemorySlots = table.Column<int>(type: "int", nullable: true),
                    MaxMemoryGB = table.Column<int>(type: "int", nullable: true),
                    PCIeSlots = table.Column<int>(type: "int", nullable: true),
                    M2Slots = table.Column<int>(type: "int", nullable: true),
                    SataSlots = table.Column<int>(type: "int", nullable: true),
                    WattageRating = table.Column<int>(type: "int", nullable: true),
                    Efficiency = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Modular = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    FormFactor = table.Column<int>(type: "int", nullable: true),
                    Type = table.Column<int>(type: "int", nullable: true),
                    SpeedMHz = table.Column<int>(type: "int", nullable: true),
                    CapacityGB = table.Column<int>(type: "int", nullable: true),
                    ModuleCount = table.Column<int>(type: "int", nullable: true),
                    CASLatency = table.Column<int>(type: "int", nullable: true),
                    Storage_Type = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Storage_CapacityGB = table.Column<int>(type: "int", nullable: true),
                    Interface = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ReadSpeedMBps = table.Column<int>(type: "int", nullable: true),
                    WriteSpeedMBps = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Part", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Builds",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ShareCode = table.Column<string>(type: "varchar(95)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CPUId = table.Column<int>(type: "int", nullable: true),
                    CoolerId = table.Column<int>(type: "int", nullable: true),
                    MotherboardId = table.Column<int>(type: "int", nullable: true),
                    RAMId = table.Column<int>(type: "int", nullable: true),
                    GPUId = table.Column<int>(type: "int", nullable: true),
                    StorageId = table.Column<int>(type: "int", nullable: true),
                    PSUId = table.Column<int>(type: "int", nullable: true),
                    CaseId = table.Column<int>(type: "int", nullable: true),
                    CaseFanId = table.Column<int>(type: "int", nullable: true),
                    TotalPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalWattage = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Builds", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Builds");

            migrationBuilder.DropTable(
                name: "Part");
        }
    }
}
