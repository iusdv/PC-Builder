using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PCPartPicker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBuildOwner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
SET @sql := (
    SELECT IF(
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Builds' AND column_name = 'UserId') = 0,
        'ALTER TABLE `Builds` ADD COLUMN `UserId` varchar(255) CHARACTER SET utf8mb4 NULL;',
        'SELECT 1;'
    )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
SET @sql := (
    SELECT IF(
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Builds' AND column_name = 'UserId') = 1,
        'ALTER TABLE `Builds` DROP COLUMN `UserId`;',
        'SELECT 1;'
    )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
");
        }
    }
}
