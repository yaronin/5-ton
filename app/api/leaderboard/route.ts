import { NextResponse } from "next/server";

import { getDb } from "@/db";

export const dynamic = "force-dynamic";

const LEADERBOARD_SQL = `
      SELECT
        u.display_name AS displayName,
        CAST(MIN(sr.duration_ms) AS INTEGER) AS bestMs,
        (
          SELECT sr2.weight
          FROM session_results sr2
          WHERE sr2.user_id = u.id
            AND sr2.is_completed = 1
          ORDER BY sr2.duration_ms ASC, sr2.id ASC
          LIMIT 1
        ) AS pbWeight
      FROM session_results sr
      INNER JOIN users u ON u.id = sr.user_id
      WHERE sr.is_completed = 1
      GROUP BY u.id, u.display_name
      ORDER BY MIN(sr.duration_ms) ASC
      LIMIT 5
    `;

export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  bestMs: number;
  pbWeight: number | null;
};

export async function GET() {
  try {
    const db = getDb();
    const result = await db.$client.execute({
      sql: LEADERBOARD_SQL,
      args: [],
    });

    const raw = result.rows as Array<{
      displayName?: string | number | null;
      bestMs?: string | number | null;
      pbWeight?: string | number | null;
    }>;

    const entries: LeaderboardEntry[] = raw.map((row, index) => ({
      rank: index + 1,
      displayName: String(row.displayName ?? ""),
      bestMs: Number(row.bestMs ?? 0),
      pbWeight:
        row.pbWeight === null || row.pbWeight === undefined
          ? null
          : Number(row.pbWeight),
    }));

    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [] as LeaderboardEntry[] });
  }
}
