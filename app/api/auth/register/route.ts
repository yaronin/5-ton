import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/defaultAdmin";
import { hashPassword } from "@/lib/password";
import { sqliteBoolean } from "@/lib/sqliteBoolean";
import {
  attachSessionCookie,
  createAuthSession,
} from "@/lib/session";
import { validateRegisterInput } from "@/lib/validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = validateRegisterInput(body as Record<string, unknown>);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { email, password, displayName } = parsed;

  if (email === DEFAULT_ADMIN_EMAIL) {
    return NextResponse.json(
      {
        error:
          "This email is reserved for the built-in admin. Log in with it (or run npm run db:seed) instead of registering.",
      },
      { status: 403 }
    );
  }

  const db = getDb();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const [{ count: userCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  const isFirstUser = Number(userCount) === 0;
  const bootstrap = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const isAdmin = isFirstUser || (!!bootstrap && email === bootstrap);

  const passwordHash = hashPassword(password);
  const createdAt = new Date();

  const [inserted] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      displayName,
      isAdmin,
      createdAt,
    })
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      isAdmin: users.isAdmin,
    });

  if (!inserted) {
    return NextResponse.json(
      { error: "Could not create account." },
      { status: 500 }
    );
  }

  const session = await createAuthSession(inserted.id);
  const res = NextResponse.json({
    user: {
      id: inserted.id,
      email: inserted.email,
      displayName: inserted.displayName,
      isAdmin: sqliteBoolean(inserted.isAdmin),
    },
  });
  attachSessionCookie(res, session.id, session.expiresAt);
  return res;
}
