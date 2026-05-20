"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Flame } from "lucide-react";

import { AuthForm } from "@/app/components/AuthForm";
import { LeaderboardStrip } from "@/app/components/LeaderboardStrip";

function LoginContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const redirectTo =
    from && from.startsWith("/") && !from.startsWith("//") ? from : "/";

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grit-noise" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-amber-500/[0.06] to-transparent" />

      <div className="safe-y relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-8 sm:py-8">
        <header className="mb-6 flex items-center gap-3 sm:mb-8">
          <div className="grid h-9 w-9 place-items-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 sm:h-10 sm:w-10">
            <Flame className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
              Protocol&nbsp;//&nbsp;5T-01
            </span>
            <span className="font-display text-base font-bold uppercase tracking-[0.14em] text-neutral-100 sm:text-lg sm:tracking-widest">
              The 5-Ton Challenge
            </span>
          </div>
        </header>

        <LeaderboardStrip />

        <div className="flex flex-1 flex-col items-center justify-center py-6">
          <AuthForm redirectTo={redirectTo} mergeLocalOnSuccess />
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-neutral-950 font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
          Loading…
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
