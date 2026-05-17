import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import type { NextResponse } from "next/server";

import { getDb } from "@/db";
import { authSessions, users } from "@/db/schema";

export const SESSION_COOKIE = "ftc_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export function newSessionId(): string {
  return randomBytes(32).toString("hex");
}

export async function createAuthSession(userId: number) {
  const db = getDb();
  const id = newSessionId();
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await db.insert(authSessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

export async function deleteAuthSession(sessionId: string) {
  await getDb().delete(authSessions).where(eq(authSessions.id, sessionId));
}

export type SessionUser = {
  id: number;
  email: string;
  displayName: string;
  isAdmin: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const db = getDb();
  const now = new Date();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      isAdmin: users.isAdmin,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.id, sid), gt(authSessions.expiresAt, now)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    isAdmin: Boolean(row.isAdmin),
  };
}

export function attachSessionCookie(
  response: NextResponse,
  sessionId: string,
  expiresAt: Date
) {
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

export function readSessionIdFromCookie(): string | undefined {
  return cookies().get(SESSION_COOKIE)?.value;
}
