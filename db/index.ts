import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __ftcDb: Db | undefined;
}

function resolveDatabaseUrl(): string {
  const fromEnv = process.env.TURSO_DATABASE_URL?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") {
    return "file:./local.db";
  }
  throw new Error(
    "TURSO_DATABASE_URL is not set. Add it to .env.local (see README), or set it in your host’s environment (e.g. Vercel project settings)."
  );
}

function createDb(): Db {
  const url = resolveDatabaseUrl();
  const client = createClient({
    url,
    ...(process.env.TURSO_AUTH_TOKEN
      ? { authToken: process.env.TURSO_AUTH_TOKEN }
      : {}),
  });
  return drizzle(client, { schema });
}

export function getDb(): Db {
  if (process.env.NODE_ENV === "production") {
    return createDb();
  }
  if (!globalThis.__ftcDb) {
    globalThis.__ftcDb = createDb();
  }
  return globalThis.__ftcDb;
}
