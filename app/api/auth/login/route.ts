import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { sqliteBoolean } from "@/lib/sqliteBoolean";
import {
  attachSessionCookie,
  createAuthSession,
} from "@/lib/session";
import { validateLoginInput } from "@/lib/validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = validateLoginInput(body as Record<string, unknown>);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { email, password } = parsed;

  try {
    const db = getDb();

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        isAdmin: users.isAdmin,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = rows[0];
    if (
      !user ||
      typeof user.passwordHash !== "string" ||
      !user.passwordHash.length
    ) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }
    let passwordOk = false;
    try {
      passwordOk = verifyPassword(password, user.passwordHash);
    } catch {
      passwordOk = false;
    }
    if (!passwordOk) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const session = await createAuthSession(user.id);
    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isAdmin: sqliteBoolean(user.isAdmin),
      },
    });
    attachSessionCookie(res, session.id, session.expiresAt);
    return res;
  } catch (err) {
    console.error("[auth/login]", err);
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json(
      {
        error:
          "Login failed. Check the server console, database URL, and that `npm run db:push` was applied.",
        ...(process.env.NODE_ENV === "development" ? { detail: message } : {}),
      },
      { status: 500 }
    );
  }
}
