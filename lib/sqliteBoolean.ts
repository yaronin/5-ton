/**
 * Coerce SQLite / libSQL boolean columns (0/1 as number or string).
 * Do not use Boolean(value): Boolean("0") is true in JavaScript.
 */
export function sqliteBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}
