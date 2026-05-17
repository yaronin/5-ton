"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

import { formatTime } from "@/lib/formatTime";

type Entry = {
  rank: number;
  displayName: string;
  bestMs: number;
  pbWeight: number | null;
};

export function LeaderboardStrip() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data: { entries?: Entry[] }) => {
        if (!cancelled) {
          setEntries(Array.isArray(data.entries) ? data.entries : []);
        }
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loaded && entries.length === 0) {
    return null;
  }

  return (
    <section className="mb-5 rounded-lg border border-neutral-900 bg-neutral-950/70 p-4 sm:mb-6 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 text-emerald-400">
          <Trophy className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-300/90">
            Hall of fame
          </p>
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-neutral-100 sm:text-base">
            Top 5 fastest finishes
          </h2>
        </div>
      </div>
      {!loaded ? (
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
          Loading leaderboard…
        </p>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-5">
          {entries.map((e) => (
            <li
              key={`${e.rank}-${e.displayName}`}
              className="flex flex-col rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                #{e.rank}
              </span>
              <span className="truncate font-display text-sm font-semibold uppercase tracking-wide text-neutral-100">
                {e.displayName || "—"}
              </span>
              <span className="mt-1 font-mono text-xs tabular-nums text-emerald-400">
                {formatTime(e.bestMs)}
              </span>
              {e.pbWeight != null && (
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  @ {e.pbWeight} kg
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
