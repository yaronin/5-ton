import { getDb } from "@/db";
import { sqliteBoolean } from "@/lib/sqliteBoolean";

/** Read is_admin from DB without Drizzle boolean mode (Boolean("0") is true). */
export async function readUserIsAdminFromDb(userId: number): Promise<boolean> {
  const db = getDb();
  const result = await db.$client.execute({
    sql: "SELECT is_admin FROM users WHERE id = ? LIMIT 1",
    args: [userId],
  });
  const row = result.rows[0] as { is_admin?: unknown } | undefined;
  if (!row) return false;
  return sqliteBoolean(row.is_admin);
}

export async function countAdminUsers(): Promise<number> {
  const db = getDb();
  const result = await db.$client.execute({
    sql: "SELECT COUNT(*) AS c FROM users WHERE is_admin = 1",
    args: [],
  });
  const row = result.rows[0] as { c?: unknown } | undefined;
  return Number(row?.c ?? 0);
}

/** For Drizzle writes/filters after schema uses integer is_admin (0 | 1). */
export function adminFlagToDb(isAdmin: boolean): 0 | 1 {
  return isAdmin ? 1 : 0;
}
