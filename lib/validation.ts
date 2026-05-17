import { resolveCredentialToEmail } from "@/lib/defaultAdmin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateRegisterInput(body: {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
}): { ok: true; email: string; password: string; displayName: string } | { ok: false; error: string } {
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Valid email is required." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (displayName.length < 1 || displayName.length > 40) {
    return { ok: false, error: "Display name must be 1–40 characters." };
  }
  return { ok: true, email, password, displayName };
}

export function validateLoginInput(body: {
  email?: unknown;
  password?: unknown;
}): { ok: true; email: string; password: string } | { ok: false; error: string } {
  const raw = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const email = resolveCredentialToEmail(raw);
  if (!email || !password) {
    return {
      ok: false,
      error: "Enter your email (or admin) and password.",
    };
  }
  return { ok: true, email, password };
}
