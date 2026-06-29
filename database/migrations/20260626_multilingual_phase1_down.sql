-- Phase 1 multilingual area routing rollback.
-- Safe to run repeatedly on the same MySQL database.

DELIMITER //

CREATE PROCEDURE pboot_phase1_drop_index(IN table_name VARCHAR(64), IN index_name VARCHAR(64), IN ddl_sql VARCHAR(1000))
BEGIN
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = table_name
          AND INDEX_NAME = index_name
    ) THEN
        SET @sql = ddl_sql;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//

CREATE PROCEDURE pboot_phase1_drop_column(IN table_name VARCHAR(64), IN column_name VARCHAR(64), IN ddl_sql VARCHAR(1000))
BEGIN
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = table_name
          AND COLUMN_NAME = column_name
    ) THEN
        SET @sql = ddl_sql;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//

DELIMITER ;

CALL pboot_phase1_drop_index('ay_area', 'idx_area_directory', 'ALTER TABLE `ay_area` DROP INDEX `idx_area_directory`');
CALL pboot_phase1_drop_index('ay_area', 'idx_area_language_sort', 'ALTER TABLE `ay_area` DROP INDEX `idx_area_language_sort`');

CALL pboot_phase1_drop_column('ay_area', 'flag_icon', 'ALTER TABLE `ay_area` DROP COLUMN `flag_icon`');
CALL pboot_phase1_drop_column('ay_area', 'language_sort', 'ALTER TABLE `ay_area` DROP COLUMN `language_sort`');
CALL pboot_phase1_drop_column('ay_area', 'directory', 'ALTER TABLE `ay_area` DROP COLUMN `directory`');

DROP PROCEDURE pboot_phase1_drop_index;
DROP PROCEDURE pboot_phase1_drop_column;
