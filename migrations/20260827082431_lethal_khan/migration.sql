CREATE TABLE `plugin_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`plugin_id` text NOT NULL,
	`snapshot_at` text NOT NULL,
	`views` integer,
	`copies` integer,
	`hearts` integer,
	`verification_status` text,
	`version` text,
	`repository_updated_at` text,
	`upstream_check_status` text
);
--> statement-breakpoint
CREATE TABLE `plugins` (
	`id` text PRIMARY KEY,
	`name` text,
	`description` text,
	`author` text,
	`category` text,
	`kind` text,
	`license` text,
	`tags` text,
	`added_at` text,
	`repo` text,
	`stars` integer,
	`install_available` integer,
	`status` text,
	`source_type` text
);
--> statement-breakpoint
CREATE TABLE `update_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`plugin_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`from_version` text,
	`to_version` text
);
--> statement-breakpoint
CREATE TABLE `verification_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`plugin_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`from_status` text,
	`to_status` text
);
--> statement-breakpoint
CREATE INDEX `snapshots_plugin_time_idx` ON `plugin_snapshots` (`plugin_id`,`snapshot_at`);--> statement-breakpoint
CREATE INDEX `snapshots_time_idx` ON `plugin_snapshots` (`snapshot_at`);--> statement-breakpoint
CREATE INDEX `plugins_added_at_idx` ON `plugins` (`added_at`);--> statement-breakpoint
CREATE INDEX `plugins_author_idx` ON `plugins` (`author`);--> statement-breakpoint
CREATE INDEX `update_events_time_idx` ON `update_events` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `update_events_plugin_idx` ON `update_events` (`plugin_id`);--> statement-breakpoint
CREATE INDEX `verification_events_time_idx` ON `verification_events` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `verification_events_plugin_idx` ON `verification_events` (`plugin_id`);