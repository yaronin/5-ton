import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { sessionResults } from "@/db/schema";
import { parseResultBody } from "@/lib/parseSessionResult";
import { getSessionUser } from "@/lib/session";

const MAX_BULK = 100;

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

  const rawList = (body as { results?: unknown }).results;
  if (!Array.isArray(rawList)) {
    return NextResponse.json(
      { error: "Expected { results: [...] }." },
      { status: 400 }
    );
  }

  const slice = rawList.slice(0, MAX_BULK);
  const rows: (typeof sessionResults.$inferInsert)[] = [];
  for (const item of slice) {
    const parsed = parseResultBody(item as Record<string, unknown>);
    if (parsed) {
      rows.push({ ...parsed, userId: user.id });
    }
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid results in payload.", imported: 0 },
      { status: 400 }
    );
  }

  const db = getDb();
  await db.insert(sessionResults).values(rows);

  return NextResponse.json({ imported: rows.length });
}
