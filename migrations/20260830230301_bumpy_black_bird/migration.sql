CREATE TABLE `omarchy_stars` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`recorded_at` text NOT NULL,
	`stars` integer NOT NULL,
	`source` text DEFAULT 'poll' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `omarchy_stars_recorded_at_idx` ON `omarchy_stars` (`recorded_at`);