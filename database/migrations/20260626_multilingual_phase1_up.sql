-- Phase 1 multilingual area routing upgrade.
-- Safe to run repeatedly on the same MySQL database.

DELIMITER //

CREATE PROCEDURE pboot_phase1_add_column(IN table_name VARCHAR(64), IN column_name VARCHAR(64), IN ddl_sql VARCHAR(1000))
BEGIN
    IF NOT EXISTS (
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

CREATE PROCEDURE pboot_phase1_add_index(IN table_name VARCHAR(64), IN index_name VARCHAR(64), IN ddl_sql VARCHAR(1000))
BEGIN
    IF NOT EXISTS (
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

DELIMITER ;

CALL pboot_phase1_add_column('ay_area', 'directory', 'ALTER TABLE `ay_area` ADD COLUMN `directory` varchar(50) NOT NULL DEFAULT '''' COMMENT ''Language virtual directory'' AFTER `domain`');
CALL pboot_phase1_add_column('ay_area', 'language_sort', 'ALTER TABLE `ay_area` ADD COLUMN `language_sort` int(11) NOT NULL DEFAULT 0 COMMENT ''Language display sort'' AFTER `directory`');
CALL pboot_phase1_add_column('ay_area', 'flag_icon', 'ALTER TABLE `ay_area` ADD COLUMN `flag_icon` varchar(255) NOT NULL DEFAULT '''' COMMENT ''Language flag icon'' AFTER `language_sort`');

CALL pboot_phase1_add_index('ay_area', 'idx_area_directory', 'ALTER TABLE `ay_area` ADD INDEX `idx_area_directory` (`directory`)');
CALL pboot_phase1_add_index('ay_area', 'idx_area_language_sort', 'ALTER TABLE `ay_area` ADD INDEX `idx_area_language_sort` (`language_sort`)');

DROP PROCEDURE pboot_phase1_add_column;
DROP PROCEDURE pboot_phase1_add_index;
