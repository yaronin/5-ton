PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`completed_at` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`weight` real NOT NULL,
	`target_reps` integer NOT NULL,
	`pull_reps` integer NOT NULL,
	`dip_reps` integer NOT NULL,
	`is_completed` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_session_results`("id", "user_id", "completed_at", "duration_ms", "weight", "target_reps", "pull_reps", "dip_reps", "is_completed") SELECT "id", "user_id", "completed_at", "duration_ms", "weight", "target_reps", "pull_reps", "dip_reps", "is_completed" FROM `session_results`;--> statement-breakpoint
DROP TABLE `session_results`;--> statement-breakpoint
ALTER TABLE `__new_session_results` RENAME TO `session_results`;--> statement-breakpoint
PRAGMA foreign_keys=ON;