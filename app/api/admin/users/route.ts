import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { getSessionUser } from "@/lib/session";

const ADMIN_USERS_SQL = `
      SELECT
        u.id AS id,
        u.email AS email,
        u.display_name AS displayName,
        u.is_admin AS isAdmin,
        u.created_at AS createdAt,
        COUNT(sr.id) AS attemptCount,
        MIN(CASE WHEN sr.is_completed = 1 THEN sr.duration_ms END) AS bestMs,
        MAX(sr.completed_at) AS lastActivityAt
      FROM users u
      LEFT JOIN session_results sr ON sr.user_id = u.id
      GROUP BY u.id
      ORDER BY u.id ASC
    `;

export async function GET() {
  const me = await getSessionUser();
  if (!me?.isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const db = getDb();
    const result = await db.$client.execute({
      sql: ADMIN_USERS_SQL,
      args: [],
    });

    const rows = result.rows as Array<{
      id?: string | number | null;
      email?: string | null;
      displayName?: string | null;
      isAdmin?: string | number | null;
      createdAt?: string | number | null;
      attemptCount?: string | number | null;
      bestMs?: string | number | null;
      lastActivityAt?: string | number | null;
    }>;

    const users = rows.map((r) => ({
      id: Number(r.id),
      email: String(r.email ?? ""),
      displayName: String(r.displayName ?? ""),
      isAdmin: Boolean(Number(r.isAdmin ?? 0)),
      createdAt: Number(r.createdAt),
      attemptCount: Number(r.attemptCount ?? 0),
      bestMs:
        r.bestMs === null || r.bestMs === undefined
          ? null
          : Number(r.bestMs),
      lastActivityAt:
        r.lastActivityAt === null || r.lastActivityAt === undefined
          ? null
          : Number(r.lastActivityAt),
    }));

    return NextResponse.json({ users });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not load users." },
      { status: 500 }
    );
  }
}
