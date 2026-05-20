import {
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  isAdmin: integer("is_admin").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const sessionResults = sqliteTable("session_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  completedAt: integer("completed_at", { mode: "timestamp" }).notNull(),
  durationMs: integer("duration_ms").notNull(),
  weight: real("weight").notNull(),
  targetReps: integer("target_reps").notNull(),
  pullReps: integer("pull_reps").notNull(),
  dipReps: integer("dip_reps").notNull(),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SessionResultRow = typeof sessionResults.$inferSelect;
