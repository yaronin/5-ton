/**
 * Creates the built-in admin user if missing.
 * Run: npm run db:seed
 * Loads .env.local when present. If TURSO_DATABASE_URL is unset, uses file:./local.db.
 */
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

const DEFAULT_EMAIL = "admin@five-ton.local";
const DEFAULT_DISPLAY = "Admin";
const DEFAULT_PASSWORD = "Unix11!";

const url =
  process.env.TURSO_DATABASE_URL?.trim() || "file:./local.db";
if (!process.env.TURSO_DATABASE_URL?.trim()) {
  console.log("Using default database URL: file:./local.db (set TURSO_DATABASE_URL to override)");
}

const client = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN
    ? { authToken: process.env.TURSO_AUTH_TOKEN }
    : {}),
});
const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
const now = Date.now();

const existing = await client.execute({
  sql: "SELECT id FROM users WHERE email = ?",
  args: [DEFAULT_EMAIL],
});

if (existing.rows.length > 0) {
  console.log("Default admin already exists:", DEFAULT_EMAIL);
  process.exit(0);
}

await client.execute({
  sql: `INSERT INTO users (email, password_hash, display_name, is_admin, created_at) VALUES (?, ?, ?, 1, ?)`,
  args: [DEFAULT_EMAIL, hash, DEFAULT_DISPLAY, now],
});

console.log("Seeded default admin user.");
console.log("  Log in with email: admin@five-ton.local  — or username: admin");
console.log("  Display name:", DEFAULT_DISPLAY);
console.log("  Password:", DEFAULT_PASSWORD);
