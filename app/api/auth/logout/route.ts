import { NextResponse } from "next/server";

import {
  clearSessionCookie,
  deleteAuthSession,
  readSessionIdFromCookie,
} from "@/lib/session";

export async function POST() {
  const sid = readSessionIdFromCookie();
  if (sid) {
    await deleteAuthSession(sid).catch(() => undefined);
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
