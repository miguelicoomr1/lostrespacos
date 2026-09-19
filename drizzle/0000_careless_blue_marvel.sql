CREATE TABLE `closed_dates` (
	`date` text PRIMARY KEY NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`people` integer NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`zone` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `zones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`capacity` integer NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zones_name_unique` ON `zones` (`name`);