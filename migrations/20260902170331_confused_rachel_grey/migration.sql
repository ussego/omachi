CREATE TABLE `meta` (
	`key` text PRIMARY KEY,
	`value` integer
);
-- One-time seed of the running snapshot counter; afterwards the heavy poll
-- increments/decrements it so nothing ever full-scans plugin_snapshots again.
INSERT INTO `meta` (`key`, `value`) SELECT 'snapshot_count', COUNT(*) FROM `plugin_snapshots`;
