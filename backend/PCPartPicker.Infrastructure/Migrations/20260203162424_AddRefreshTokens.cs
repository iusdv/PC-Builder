using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PCPartPicker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRefreshTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Minimal RefreshTokens DDL (no foreign keys/indexes) and idempotent.
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `RefreshTokens` (
    `Id` char(36) COLLATE ascii_general_ci NOT NULL,
    `UserId` varchar(36) NOT NULL,
    `TokenHash` varchar(64) NOT NULL,
    `CreatedAt` datetime NOT NULL,
    `ExpiresAt` datetime NOT NULL,
    `RevokedAt` datetime NULL,
    `CreatedByIp` longtext NULL,
    `RevokedByIp` longtext NULL,
    `ReplacedByTokenId` char(36) COLLATE ascii_general_ci NULL,
    PRIMARY KEY (`Id`)
) CHARACTER SET utf8mb4;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RefreshTokens");
        }
    }
}
