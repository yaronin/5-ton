import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "drizzle-kit";

/** Load .env.local / .env so `npm run db:push` sees Turso vars (Next.js does this for dev; drizzle-kit does not). */
function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
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
}

loadEnvFiles();

const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const isFileDb = url.startsWith("file:");

export default defineConfig(
  isFileDb
    ? {
        schema: "./db/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: { url },
      }
    : {
        schema: "./db/schema.ts",
        out: "./drizzle",
        dialect: "turso",
        dbCredentials: {
          url,
          authToken: process.env.TURSO_AUTH_TOKEN ?? "",
        },
      }
);
