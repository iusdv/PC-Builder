using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PCPartPicker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIdentityAuth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Part",
                type: "datetime",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Part",
                type: "datetime",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Builds",
                type: "datetime",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ShareCode",
                table: "Builds",
                type: "varchar(255)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(95)")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Builds",
                type: "datetime",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime");

            // Minimal Identity DDL (custom table names; no external logins/roles).
            // Use IF NOT EXISTS so manual schema edits don't brick migrations.
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `Users` (
    `Id` varchar(36) NOT NULL,
    `UserName` varchar(191) NULL,
    `NormalizedUserName` varchar(191) NULL,
    `Email` varchar(191) NULL,
    `NormalizedEmail` varchar(191) NULL,
    `EmailConfirmed` tinyint(1) NOT NULL DEFAULT 0,
    `PasswordHash` longtext NULL,
    `SecurityStamp` longtext NULL,
    `ConcurrencyStamp` longtext NULL,
    `PhoneNumber` longtext NULL,
    `PhoneNumberConfirmed` tinyint(1) NOT NULL DEFAULT 0,
    `TwoFactorEnabled` tinyint(1) NOT NULL DEFAULT 0,
    `LockoutEnd` datetime NULL,
    `LockoutEnabled` tinyint(1) NOT NULL DEFAULT 0,
    `AccessFailedCount` int NOT NULL DEFAULT 0,
    `Role` varchar(16) NOT NULL DEFAULT 'user',
    PRIMARY KEY (`Id`)
) CHARACTER SET utf8mb4;
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `UserClaims` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `UserId` varchar(36) NOT NULL,
    `ClaimType` longtext NULL,
    `ClaimValue` longtext NULL,
    PRIMARY KEY (`Id`)
) CHARACTER SET utf8mb4;
");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `UserTokens` (
    `UserId` varchar(36) NOT NULL,
    `LoginProvider` varchar(128) NOT NULL,
    `Name` varchar(128) NOT NULL,
    `Value` longtext NULL,
    PRIMARY KEY (`UserId`, `LoginProvider`, `Name`)
) CHARACTER SET utf8mb4;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS `UserTokens`;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS `UserClaims`;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS `Users`;");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Part",
                type: "datetime",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Part",
                type: "datetime",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Builds",
                type: "datetime",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ShareCode",
                table: "Builds",
                type: "varchar(95)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Builds",
                type: "datetime",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime");
        }
    }
}
