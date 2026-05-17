import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { sessionResults } from "@/db/schema";
import { parseResultBody } from "@/lib/parseSessionResult";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: sessionResults.id,
      completedAt: sessionResults.completedAt,
      durationMs: sessionResults.durationMs,
      weight: sessionResults.weight,
      targetReps: sessionResults.targetReps,
      pullReps: sessionResults.pullReps,
      dipReps: sessionResults.dipReps,
      isCompleted: sessionResults.isCompleted,
    })
    .from(sessionResults)
    .where(eq(sessionResults.userId, user.id))
    .orderBy(desc(sessionResults.completedAt))
    .limit(200);

  return NextResponse.json({
    results: rows.map((r) => ({
      id: r.id,
      completedAt: r.completedAt.getTime(),
      durationMs: r.durationMs,
      weight: r.weight,
      targetReps: r.targetReps,
      pullReps: r.pullReps,
      dipReps: r.dipReps,
      isCompleted: Boolean(r.isCompleted),
    })),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const row = parseResultBody(body as Record<string, unknown>);
  if (!row) {
    return NextResponse.json({ error: "Invalid result payload." }, { status: 400 });
  }

  const db = getDb();
  const [inserted] = await db
    .insert(sessionResults)
    .values({ ...row, userId: user.id })
    .returning({ id: sessionResults.id });

  return NextResponse.json({ id: inserted?.id ?? null });
}
