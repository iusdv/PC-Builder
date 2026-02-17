using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PCPartPicker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMorePhysicalDimensions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "GpuHeightMM",
                table: "Part",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxCoolerHeightMM",
                table: "Part",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PsuLengthMM",
                table: "Part",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GpuHeightMM",
                table: "Part");

            migrationBuilder.DropColumn(
                name: "MaxCoolerHeightMM",
                table: "Part");

            migrationBuilder.DropColumn(
                name: "PsuLengthMM",
                table: "Part");
        }
    }
}
