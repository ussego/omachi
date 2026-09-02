CREATE TABLE `plugin_relations` (
	`plugin_id` text PRIMARY KEY,
	`related` text,
	`cluster` text,
	`influence` real,
	`refreshed_at` text
);
