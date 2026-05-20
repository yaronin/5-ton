import { and, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/defaultAdmin";
import { hashPassword } from "@/lib/password";
import { getSessionUser } from "@/lib/session";
import { sqliteBoolean } from "@/lib/sqliteBoolean";
import { normalizeEmail } from "@/lib/validation";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function countAdmins(): Promise<number> {
  const db = getDb();
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.isAdmin, true));
  return Number(c ?? 0);
}

async function resolveUserId(
  params: { id: string } | Promise<{ id: string }>
): Promise<number | null> {
  const p = await Promise.resolve(params);
  const id = Number(p.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const me = await getSessionUser();
  if (!me?.isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const id = await resolveUserId(context.params);
  if (id === null) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const emailRaw = body.email;
  const displayNameRaw = body.displayName;
  const isAdminRaw = body.isAdmin;
  const newPasswordRaw = body.newPassword;

  const hasPatch =
    emailRaw !== undefined ||
    displayNameRaw !== undefined ||
    isAdminRaw !== undefined ||
    newPasswordRaw !== undefined;
  if (!hasPatch) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const updates: {
    email?: string;
    displayName?: string;
    isAdmin?: boolean;
    passwordHash?: string;
  } = {};

  if (typeof emailRaw === "string") {
    const email = normalizeEmail(emailRaw);
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }
    if (email === DEFAULT_ADMIN_EMAIL && target.email !== DEFAULT_ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "That email is reserved for the built-in admin account." },
        { status: 403 }
      );
    }
    const dup = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), ne(users.id, id)))
      .limit(1);
    if (dup.length > 0) {
      return NextResponse.json(
        { error: "Another user already uses this email." },
        { status: 409 }
      );
    }
    updates.email = email;
  }

  if (typeof displayNameRaw === "string") {
    const displayName = displayNameRaw.trim();
    if (displayName.length < 1 || displayName.length > 40) {
      return NextResponse.json(
        { error: "Display name must be 1–40 characters." },
        { status: 400 }
      );
    }
    updates.displayName = displayName;
  }

  if (isAdminRaw !== undefined) {
    const nextAdmin = Boolean(isAdminRaw);
    if (sqliteBoolean(target.isAdmin) && !nextAdmin) {
      const admins = await countAdmins();
      if (admins <= 1) {
        return NextResponse.json(
          { error: "Cannot remove admin from the last admin account." },
          { status: 400 }
        );
      }
    }
    updates.isAdmin = nextAdmin;
  }

  if (newPasswordRaw !== undefined) {
    const np = typeof newPasswordRaw === "string" ? newPasswordRaw : "";
    if (np.length > 0 && np.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }
    if (np.length >= 8) {
      updates.passwordHash = hashPassword(np);
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    await db.update(users).set(updates).where(eq(users.id, id));
  } catch (e) {
    console.error("[admin/users PATCH]", e);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const me = await getSessionUser();
  if (!me?.isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const id = await resolveUserId(context.params);
  if (id === null) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  if (id === me.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (sqliteBoolean(target.isAdmin)) {
    const admins = await countAdmins();
    if (admins <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last admin account." },
        { status: 400 }
      );
    }
  }

  try {
    await db.delete(users).where(eq(users.id, id));
  } catch (e) {
    console.error("[admin/users DELETE]", e);
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
