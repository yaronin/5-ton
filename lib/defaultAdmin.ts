/** Seeded built-in admin (see `npm run db:seed`). */
export const DEFAULT_ADMIN_EMAIL = "admin@five-ton.local";

/**
 * Resolves the login "email" field to a stored email address.
 * Allows signing in with the literal `admin` (case-insensitive) as a shortcut.
 */
export function resolveCredentialToEmail(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const asShortcut = trimmed.toLowerCase();
  if (asShortcut === "admin") {
    return DEFAULT_ADMIN_EMAIL;
  }
  const normalized = trimmed.toLowerCase();
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(normalized)) return null;
  return normalized;
}
