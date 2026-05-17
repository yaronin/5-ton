import { sessionResults } from "@/db/schema";

export type ParsedSessionResult = Omit<
  typeof sessionResults.$inferInsert,
  "userId"
>;

export function parseResultBody(
  body: Record<string, unknown>
): ParsedSessionResult | null {
  const completedAt = Number(body.completedAt);
  const durationMs = Number(body.durationMs);
  const weight = Number(body.weight);
  const targetReps = Number(body.targetReps);
  const pullReps = Number(body.pullReps);
  const dipReps = Number(body.dipReps);
  const isCompleted = Boolean(body.isCompleted);

  if (
    !Number.isFinite(completedAt) ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0 ||
    !Number.isFinite(weight) ||
    weight <= 0 ||
    !Number.isFinite(targetReps) ||
    targetReps <= 0 ||
    !Number.isFinite(pullReps) ||
    pullReps < 0 ||
    !Number.isFinite(dipReps) ||
    dipReps < 0
  ) {
    return null;
  }

  return {
    completedAt: new Date(completedAt),
    durationMs: Math.floor(durationMs),
    weight: Math.round(weight * 10) / 10,
    targetReps: Math.floor(targetReps),
    pullReps: Math.floor(pullReps),
    dipReps: Math.floor(dipReps),
    isCompleted,
  };
}
