using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PCPartPicker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCoolers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CoolerType",
                table: "Part",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "Cooler_Socket",
                table: "Part",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HeightMM",
                table: "Part",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RadiatorSizeMM",
                table: "Part",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CoolerId",
                table: "Builds",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Builds_CoolerId",
                table: "Builds",
                column: "CoolerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Builds_Part_CoolerId",
                table: "Builds",
                column: "CoolerId",
                principalTable: "Part",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Builds_Part_CoolerId",
                table: "Builds");

            migrationBuilder.DropIndex(
                name: "IX_Builds_CoolerId",
                table: "Builds");

            migrationBuilder.DropColumn(
                name: "CoolerType",
                table: "Part");

            migrationBuilder.DropColumn(
                name: "Cooler_Socket",
                table: "Part");

            migrationBuilder.DropColumn(
                name: "HeightMM",
                table: "Part");

            migrationBuilder.DropColumn(
                name: "RadiatorSizeMM",
                table: "Part");

            migrationBuilder.DropColumn(
                name: "CoolerId",
                table: "Builds");
        }
    }
}
