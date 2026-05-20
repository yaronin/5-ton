"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronUp,
  Flame,
  Info,
  Minus,
  RotateCcw,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";

import { UserMenu } from "@/app/components/UserMenu";
import type { AccountUser } from "@/lib/account";
import { formatTime } from "@/lib/formatTime";
import {
  STORAGE_BEST,
  STORAGE_RESULTS,
  STORAGE_WEIGHT,
} from "@/lib/storageKeys";

const TOTAL_VOLUME_KG = 5000;
const MAX_RESULTS = 40;

type Phase = "weight" | "dashboard" | "complete";

type Lift = "pull" | "dip";
type ProgressMode = "tracks" | "progress";

interface SessionResult {
  completedAt: number;
  durationMs: number;
  weight: number;
  targetReps: number;
  pullReps: number;
  dipReps: number;
  isCompleted: boolean;
}

interface ResultsExportPayload {
  version: number;
  exportedAt: number;
  bestMs: number | null;
  weight: number | null;
  results: SessionResult[];
}

function normalizeSessionResults(input: unknown): SessionResult[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const row = item as Partial<SessionResult>;
      return {
        completedAt: Number(row.completedAt) || Date.now(),
        durationMs: Number(row.durationMs) || 0,
        weight: Number(row.weight) || 0,
        targetReps: Number(row.targetReps) || 0,
        pullReps: Number(row.pullReps) || 0,
        dipReps: Number(row.dipReps) || 0,
        isCompleted: row.isCompleted ?? true,
      };
    })
    .filter((item) => item.durationMs > 0);
}

function bestMsFromResults(results: SessionResult[]): number | null {
  const completed = results.filter((r) => r.isCompleted);
  if (completed.length === 0) return null;
  return completed.reduce(
    (best, r) => Math.min(best, r.durationMs),
    completed[0].durationMs
  );
}

function storageKey(base: string, userId: number) {
  return `${base}.${userId}`;
}

export default function Page() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("weight");
  const [weight, setWeight] = useState<number | null>(null);
  const [weightInput, setWeightInput] = useState<string>("");

  const [pullReps, setPullReps] = useState(0);
  const [dipReps, setDipReps] = useState(0);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const [bestMs, setBestMs] = useState<number | null>(null);
  const [isNewPB, setIsNewPB] = useState(false);
  const [progressMode, setProgressMode] = useState<ProgressMode>("tracks");
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [activeLift, setActiveLift] = useState<Lift>("pull");
  const [showGuide, setShowGuide] = useState(false);

  const accountRef = useRef<AccountUser | null>(null);
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const loadServerData = useCallback(async (userId: number) => {
    try {
      const res = await fetch("/api/results", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        results?: Array<{
          completedAt: number;
          durationMs: number;
          weight: number;
          targetReps: number;
          pullReps: number;
          dipReps: number;
          isCompleted: boolean;
        }>;
      };
      const normalized = normalizeSessionResults(data.results ?? []).slice(
        -MAX_RESULTS
      );
      setSessionResults(normalized);
      const serverBest = bestMsFromResults(normalized);
      setBestMs(serverBest);
      try {
        localStorage.setItem(
          storageKey(STORAGE_RESULTS, userId),
          JSON.stringify(normalized)
        );
        if (serverBest != null) {
          localStorage.setItem(storageKey(STORAGE_BEST, userId), String(serverBest));
        }
      } catch {
        // ignore
      }
      const storedWeight = localStorage.getItem(storageKey(STORAGE_WEIGHT, userId));
      if (storedWeight) {
        const parsed = Number(storedWeight);
        if (Number.isFinite(parsed) && parsed > 0) {
          setWeight(parsed);
          setWeightInput(String(parsed));
          setPhase("dashboard");
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { user: AccountUser | null }) => {
        const u = d.user ?? null;
        setAccount(u);
        accountRef.current = u;
        setAuthChecked(true);
        if (u) void loadServerData(u.id);
      })
      .catch(() => {
        setAccount(null);
        accountRef.current = null;
        setAuthChecked(true);
      });
  }, [loadServerData]);

  useEffect(() => {
    if (authChecked && !account) {
      router.replace("/login");
    }
  }, [authChecked, account, router]);

  const saveSessionResult = useCallback((result: SessionResult) => {
    const u = accountRef.current;
    if (!u) return;
    void fetch("/api/results", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completedAt: result.completedAt,
        durationMs: result.durationMs,
        weight: result.weight,
        targetReps: result.targetReps,
        pullReps: result.pullReps,
        dipReps: result.dipReps,
        isCompleted: result.isCompleted,
      }),
    }).catch(() => undefined);
    setSessionResults((prev) => {
      const next = [...prev, result].slice(-MAX_RESULTS);
      try {
        localStorage.setItem(
          storageKey(STORAGE_RESULTS, u.id),
          JSON.stringify(next)
        );
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore
    });
  }, []);

  const targetReps = useMemo(() => {
    if (!weight || weight <= 0) return 0;
    return Math.ceil(TOTAL_VOLUME_KG / weight);
  }, [weight]);

  useEffect(() => {
    if (startedAt === null || finishedAt !== null) return;
    const id = window.setInterval(() => setNow(Date.now()), 53);
    return () => window.clearInterval(id);
  }, [startedAt, finishedAt]);

  useEffect(() => {
    if (
      targetReps > 0 &&
      pullReps >= targetReps &&
      dipReps >= targetReps &&
      startedAt !== null &&
      finishedAt === null
    ) {
      const end = Date.now();
      setFinishedAt(end);
      const elapsed = end - startedAt;
      if (weight !== null) {
        saveSessionResult({
          completedAt: end,
          durationMs: elapsed,
          weight,
          targetReps,
          pullReps,
          dipReps,
          isCompleted: true,
        });
      }
      const uid = accountRef.current?.id;
      try {
        const prevKey = uid != null ? storageKey(STORAGE_BEST, uid) : STORAGE_BEST;
        const prev = localStorage.getItem(prevKey);
        const prevMs = prev ? Number(prev) : null;
        if (!prevMs || elapsed < prevMs) {
          localStorage.setItem(prevKey, String(elapsed));
          setBestMs(elapsed);
          setIsNewPB(true);
        } else {
          setIsNewPB(false);
        }
      } catch {
        // ignore
      }
      setPhase("complete");
    }
  }, [pullReps, dipReps, targetReps, startedAt, finishedAt, weight, saveSessionResult]);

  const handleSetWeight = (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(weightInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const uid = accountRef.current?.id;
    try {
      if (uid != null) {
        localStorage.setItem(storageKey(STORAGE_WEIGHT, uid), String(parsed));
      }
    } catch {
      // ignore
    }
    setWeight(parsed);
    setPhase("dashboard");
  };

  const ensureStarted = useCallback(() => {
    setStartedAt((prev) => prev ?? Date.now());
  }, []);

  const exportResults = useCallback(() => {
    const payload: ResultsExportPayload = {
      version: 1,
      exportedAt: Date.now(),
      bestMs,
      weight,
      results: sessionResults,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `five-ton-results-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [bestMs, weight, sessionResults]);

  const importResultsFromText = useCallback((jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText) as
        | ResultsExportPayload
        | SessionResult[];
      const maybeResults = Array.isArray(parsed)
        ? parsed
        : (parsed as ResultsExportPayload).results;
      const normalized = normalizeSessionResults(maybeResults).slice(-MAX_RESULTS);
      if (normalized.length === 0) {
        window.alert("Import file has no valid results.");
        return;
      }
      const confirmed = window.confirm(
        "Import will replace current history and PB. Continue?"
      );
      if (!confirmed) return;

      setSessionResults(normalized);
      localStorage.setItem(STORAGE_RESULTS, JSON.stringify(normalized));

      const parsedBest = Array.isArray(parsed)
        ? null
        : Number((parsed as ResultsExportPayload).bestMs);
      const bestFromResults = normalized
        .filter((row) => row.isCompleted)
        .reduce<number | null>(
          (best, row) => (best === null ? row.durationMs : Math.min(best, row.durationMs)),
          null
        );
      const nextBest =
        Number.isFinite(parsedBest) && parsedBest! > 0
          ? parsedBest
          : bestFromResults;
      setBestMs(nextBest ?? null);
      if (nextBest) {
        localStorage.setItem(STORAGE_BEST, String(nextBest));
      } else {
        localStorage.removeItem(STORAGE_BEST);
      }

      if (!Array.isArray(parsed)) {
        const importedWeight = Number((parsed as ResultsExportPayload).weight);
        if (Number.isFinite(importedWeight) && importedWeight > 0) {
          setWeight(importedWeight);
          setWeightInput(String(importedWeight));
          localStorage.setItem(STORAGE_WEIGHT, String(importedWeight));
          setPhase("dashboard");
        }
      }
      window.alert("Results imported.");
    } catch {
      window.alert("Could not import file. Please use a valid JSON export.");
    }
  }, []);

  const incrementRep = useCallback(
    (lift: Lift) => {
      ensureStarted();
      if (lift === "pull") {
        setPullReps((r) => Math.min(targetReps, r + 1));
      } else {
        setDipReps((r) => Math.min(targetReps, r + 1));
      }
    },
    [ensureStarted, targetReps]
  );

  const decrementRep = useCallback((lift: Lift) => {
    if (lift === "pull") {
      setPullReps((r) => Math.max(0, r - 1));
    } else {
      setDipReps((r) => Math.max(0, r - 1));
    }
  }, []);

  useEffect(() => {
    if (phase !== "dashboard" || showGuide) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key;
      if (key === " ") {
        event.preventDefault();
        ensureStarted();
        return;
      }
      if (key === "1") {
        event.preventDefault();
        setActiveLift("pull");
        return;
      }
      if (key === "2") {
        event.preventDefault();
        setActiveLift("dip");
        return;
      }
      if (key === "+" || key === "=" || key === "NumpadAdd") {
        event.preventDefault();
        incrementRep(activeLift);
        return;
      }
      if (key === "-" || key === "_" || key === "NumpadSubtract") {
        event.preventDefault();
        decrementRep(activeLift);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, showGuide, ensureStarted, incrementRep, decrementRep, activeLift]);

  const resetSession = () => {
    if (startedAt !== null && finishedAt === null && (pullReps > 0 || dipReps > 0) && weight !== null) {
      saveSessionResult({
        completedAt: Date.now(),
        durationMs: Date.now() - startedAt,
        weight,
        targetReps,
        pullReps,
        dipReps,
        isCompleted: false,
      });
    }
    setPullReps(0);
    setDipReps(0);
    setStartedAt(null);
    setFinishedAt(null);
    setIsNewPB(false);
    setProgressMode("tracks");
    setPhase("dashboard");
  };

  const changeWeight = () => {
    if (startedAt !== null && finishedAt === null && (pullReps > 0 || dipReps > 0) && weight !== null) {
      saveSessionResult({
        completedAt: Date.now(),
        durationMs: Date.now() - startedAt,
        weight,
        targetReps,
        pullReps,
        dipReps,
        isCompleted: false,
      });
    }
    setPhase("weight");
    setPullReps(0);
    setDipReps(0);
    setStartedAt(null);
    setFinishedAt(null);
    setIsNewPB(false);
    setProgressMode("tracks");
  };

  const resetAllStats = () => {
    const confirmed = window.confirm(
      "Start from scratch? This clears saved weight, PB, and the current session."
    );
    if (!confirmed) return;
    const uid = accountRef.current?.id;
    try {
      if (uid != null) {
        localStorage.removeItem(storageKey(STORAGE_WEIGHT, uid));
        localStorage.removeItem(storageKey(STORAGE_BEST, uid));
        localStorage.removeItem(storageKey(STORAGE_RESULTS, uid));
      }
    } catch {
      // ignore
    }
    setWeight(null);
    setWeightInput("");
    setBestMs(null);
    setPullReps(0);
    setDipReps(0);
    setStartedAt(null);
    setFinishedAt(null);
    setIsNewPB(false);
    setSessionResults([]);
    setProgressMode("tracks");
    setPhase("weight");
  };

  const elapsedMs =
    startedAt === null ? 0 : (finishedAt ?? now) - startedAt;

  if (!authChecked || !account) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-950 font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
        Loading…
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <BackdropFX />

      <div className="safe-y relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-8 sm:py-8">
        <Header
          onOpenGuide={() => setShowGuide(true)}
          authSlot={<UserMenu user={account} />}
        />

        <AnimatePresence mode="wait">
          {phase === "weight" && (
            <WeightScreen
              key="weight"
              value={weightInput}
              onChange={setWeightInput}
              onSubmit={handleSetWeight}
              bestMs={bestMs}
            />
          )}

          {phase !== "weight" && weight !== null && (
            <Dashboard
              key="dashboard"
              weight={weight}
              targetReps={targetReps}
              pullReps={pullReps}
              dipReps={dipReps}
              elapsedMs={elapsedMs}
              hasStarted={startedAt !== null}
              isRunning={startedAt !== null && finishedAt === null}
              onIncrement={incrementRep}
              onDecrement={decrementRep}
              onStart={ensureStarted}
              onChangeWeight={changeWeight}
              onReset={resetSession}
              onResetAll={resetAllStats}
              progressMode={progressMode}
              onProgressModeChange={setProgressMode}
              sessionResults={sessionResults}
              activeLift={activeLift}
              onSetActiveLift={setActiveLift}
              onExportResults={exportResults}
              onImportResults={importResultsFromText}
              bestMs={bestMs}
            />
          )}
        </AnimatePresence>

        <Footer />
      </div>

      <AnimatePresence>
        {phase === "complete" && finishedAt !== null && startedAt !== null && (
          <CompleteOverlay
            elapsedMs={finishedAt - startedAt}
            isNewPB={isNewPB}
            bestMs={bestMs}
            targetReps={targetReps}
            weight={weight ?? 0}
            onReset={resetSession}
            onChangeWeight={changeWeight}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGuide && <GuideOverlay onClose={() => setShowGuide(false)} />}
      </AnimatePresence>
    </main>
  );
}

function BackdropFX() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 grit-noise" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-amber-500/[0.06] to-transparent" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
    </>
  );
}

function Header({
  onOpenGuide,
  authSlot,
}: {
  onOpenGuide: () => void;
  authSlot?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-3 sm:mb-8 sm:items-center">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-glow-amber sm:h-10 sm:w-10">
          <Flame className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500 sm:block">
            Protocol&nbsp;//&nbsp;5T-01
          </span>
          <span className="font-display text-base font-bold uppercase tracking-[0.14em] text-neutral-100 sm:text-lg sm:tracking-widest">
            The 5-Ton Challenge
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
        <div className="flex max-w-[min(100vw-2rem,28rem)] flex-wrap items-center justify-end gap-2">
          {authSlot}
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-950/70 px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-200 transition hover:border-amber-500/40 hover:text-amber-300 sm:px-3 sm:text-xs sm:tracking-[0.18em]"
          >
            <Info className="h-3.5 w-3.5" />
            How It Works
          </button>
        </div>
        <div className="hidden items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-neutral-300 sm:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-glow-emerald" />
          Rig Online
        </div>
      </div>
    </header>
  );
}

function GuideOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-3 backdrop-blur-sm sm:px-4"
    >
      <motion.div
        initial={{ y: 18, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 18, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 230, damping: 24 }}
        className="w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-amber-300">
              Mission Logic
            </p>
            <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-wide text-neutral-100 sm:text-3xl">
              What Is Expected
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-neutral-800 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-neutral-200 transition hover:border-neutral-600 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1 text-neutral-200">
          <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-200">
              1) Set your bodyweight
            </p>
            <p className="mt-1 text-sm leading-relaxed text-neutral-200">
              Enter your current weight in kilograms. The app calculates your rep target per lift using:
              <span className="ml-1 font-mono text-emerald-300">ceil(5000 / weight)</span>.
            </p>
          </div>

          <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-200">
              2) Complete both rep tracks
            </p>
            <p className="mt-1 text-sm leading-relaxed text-neutral-200">
              Perform pull-ups and dips separately. Each one must reach the same target reps. You can log reps with the +1 and -1 controls.
            </p>
          </div>

          <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-200">
              3) Beat the timer
            </p>
            <p className="mt-1 text-sm leading-relaxed text-neutral-200">
              The timer starts on first action (or Start Timer) and stops only when both tracks hit 100%. Your fastest completed run is saved as PB.
            </p>
          </div>

          <div className="rounded-md border border-emerald-500/35 bg-emerald-500/10 p-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-200">
              Success condition
            </p>
            <p className="mt-1 text-sm leading-relaxed text-neutral-100">
              Reach target pull-ups and target dips in one session to move the full
              <span className="mx-1 font-semibold text-emerald-300">5,000 kg</span>
              volume and register a valid finish time.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Footer() {
  return (
    <footer className="mt-8 flex flex-col items-start gap-1 border-t border-neutral-900 pt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:tracking-[0.3em]">
      <span>Move iron. Move yourself.</span>
      <span>5,000 kg / session</span>
    </footer>
  );
}

interface WeightScreenProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  bestMs: number | null;
}

function WeightScreen({ value, onChange, onSubmit, bestMs }: WeightScreenProps) {
  const numeric = Number(value);
  const valid = Number.isFinite(numeric) && numeric > 0;
  const previewTarget = valid ? Math.ceil(TOTAL_VOLUME_KG / numeric) : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-1 flex-col items-center justify-center py-6 sm:py-10"
    >
      <div className="mb-8 text-center">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.5em] text-amber-500/80">
          Step 01 // Calibrate the load
        </p>
        <h1 className="font-display text-3xl font-black uppercase leading-none tracking-tight text-neutral-100 sm:text-6xl">
          Current Weight
          <span className="ml-2 text-amber-500">(kg)?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-neutral-400">
          Your bodyweight is the bar. Enter it and we&apos;ll calculate the
          reps needed to move 5&nbsp;tons of you across pull-ups and dips.
        </p>
      </div>

      <form onSubmit={onSubmit} className="w-full max-w-xl">
        <div className="group relative">
          <input
            autoFocus
            inputMode="decimal"
            type="number"
            min={1}
            step="0.1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
            className="block w-full bg-transparent text-center font-display text-6xl font-black tracking-tight text-neutral-100 outline-none placeholder:text-neutral-800 sm:text-9xl"
          />
          <div className="mt-2 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-neutral-500">
            <span className="h-px w-10 bg-neutral-800" />
            kilograms
            <span className="h-px w-10 bg-neutral-800" />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-neutral-900 bg-neutral-950/60 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
              Reps / lift
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-amber-500">
              {valid ? previewTarget : "--"}
            </p>
          </div>
          <div className="rounded-md border border-neutral-900 bg-neutral-950/60 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
              Best time
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-emerald-500">
              {bestMs ? formatTime(bestMs) : "--:--"}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={!valid}
          className="group/btn mt-8 flex w-full items-center justify-center gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-6 py-4 font-mono text-sm font-bold uppercase tracking-[0.3em] text-amber-300 transition hover:bg-amber-500/20 hover:shadow-glow-amber disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-transparent disabled:text-neutral-700 disabled:shadow-none"
        >
          Lock In
          <ArrowRight className="h-4 w-4 transition group-hover/btn:translate-x-1" />
        </button>
      </form>
    </motion.section>
  );
}

interface DashboardProps {
  weight: number;
  targetReps: number;
  pullReps: number;
  dipReps: number;
  elapsedMs: number;
  hasStarted: boolean;
  isRunning: boolean;
  onIncrement: (lift: Lift) => void;
  onDecrement: (lift: Lift) => void;
  onStart: () => void;
  onChangeWeight: () => void;
  onReset: () => void;
  onResetAll: () => void;
  progressMode: ProgressMode;
  onProgressModeChange: (mode: ProgressMode) => void;
  sessionResults: SessionResult[];
  activeLift: Lift;
  onSetActiveLift: (lift: Lift) => void;
  onExportResults: () => void;
  onImportResults: (jsonText: string) => void;
  bestMs: number | null;
}

function Dashboard({
  weight,
  targetReps,
  pullReps,
  dipReps,
  elapsedMs,
  hasStarted,
  isRunning,
  onIncrement,
  onDecrement,
  onStart,
  onChangeWeight,
  onReset,
  onResetAll,
  progressMode,
  onProgressModeChange,
  sessionResults,
  activeLift,
  onSetActiveLift,
  onExportResults,
  onImportResults,
  bestMs,
}: DashboardProps) {
  const liveAttempt: SessionResult | null =
    hasStarted && isRunning && (pullReps > 0 || dipReps > 0)
      ? {
          completedAt: Date.now(),
          durationMs: Math.max(1, elapsedMs),
          weight,
          targetReps,
          pullReps,
          dipReps,
          isCompleted: false,
        }
      : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-1 flex-col gap-4 sm:gap-6"
    >
      <BriefingCard
        weight={weight}
        targetReps={targetReps}
        onChangeWeight={onChangeWeight}
        bestMs={bestMs}
      />

      <TimerCard
        elapsedMs={elapsedMs}
        isRunning={isRunning}
        hasStarted={hasStarted}
        onStart={onStart}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-full rounded-md border border-neutral-900 bg-neutral-950/60 p-1 sm:w-auto">
          <button
            onClick={() => onProgressModeChange("tracks")}
            className={`flex-1 rounded px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] transition sm:flex-none sm:tracking-[0.24em] ${
              progressMode === "tracks"
                ? "bg-amber-500/20 text-amber-300"
                : "text-neutral-300 hover:text-neutral-100"
            }`}
          >
            Track Mode
          </button>
          <button
            onClick={() => onProgressModeChange("progress")}
            className={`flex-1 rounded px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] transition sm:flex-none sm:tracking-[0.24em] ${
              progressMode === "progress"
                ? "bg-emerald-500/20 text-emerald-300"
                : "text-neutral-300 hover:text-neutral-100"
            }`}
          >
            Progress
          </button>
        </div>
        <p className="hidden font-mono text-xs uppercase tracking-[0.15em] text-neutral-300 sm:block">
          Keys: space start | +/- reps | 1 pull | 2 dip
        </p>
      </div>

      {progressMode === "tracks" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <RepTrack
            label="Pull-ups"
            subtitle="Vertical pull"
            icon={<ChevronUp className="h-5 w-5" strokeWidth={2.5} />}
            reps={pullReps}
            target={targetReps}
            weight={weight}
            onIncrement={() => onIncrement("pull")}
            onDecrement={() => onDecrement("pull")}
            isActive={activeLift === "pull"}
            onSelect={() => onSetActiveLift("pull")}
          />
          <RepTrack
            label="Dips"
            subtitle="Vertical push"
            icon={<Zap className="h-5 w-5" strokeWidth={2.5} />}
            reps={dipReps}
            target={targetReps}
            weight={weight}
            onIncrement={() => onIncrement("dip")}
            onDecrement={() => onDecrement("dip")}
            isActive={activeLift === "dip"}
            onSelect={() => onSetActiveLift("dip")}
          />
        </div>
      ) : (
        <ProgressGraph
          sessionResults={sessionResults}
          liveAttempt={liveAttempt}
          onExportResults={onExportResults}
          onImportResults={onImportResults}
        />
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          onClick={onResetAll}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-red-200 transition hover:bg-red-500/20 sm:w-auto sm:tracking-[0.24em]"
        >
          Start From Scratch
        </button>
      </div>

      <div className="flex sm:justify-end">
        <button
          onClick={onReset}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/60 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-neutral-200 transition hover:border-neutral-600 hover:text-white sm:w-auto sm:tracking-[0.24em]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Session
        </button>
      </div>
    </motion.section>
  );
}

interface BriefingCardProps {
  weight: number;
  targetReps: number;
  onChangeWeight: () => void;
  bestMs: number | null;
}

function BriefingCard({
  weight,
  targetReps,
  onChangeWeight,
  bestMs,
}: BriefingCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-neutral-900 bg-gradient-to-br from-neutral-950 to-neutral-900/60 p-5 sm:p-6">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-amber-500/5 to-transparent" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-amber-300">
            <Target className="h-3 w-3" />
            Mission Briefing
          </div>
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-neutral-100 sm:text-2xl">
            Your Target:{" "}
            <span className="text-amber-500">{targetReps}</span> Pull-ups &amp;{" "}
            <span className="text-amber-500">{targetReps}</span> Dips
          </h2>
          <p className="mt-1 font-mono text-sm uppercase tracking-[0.16em] text-neutral-300">
            Total Volume:{" "}
            <span className="text-emerald-400">5,000 kg</span> &nbsp;|&nbsp;
            Bodyweight:{" "}
            <span className="text-neutral-200">{weight} kg</span>
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-300">
            PB
          </div>
          <div className="font-display text-2xl font-bold text-emerald-500">
            {bestMs ? formatTime(bestMs) : "—"}
          </div>
          <button
            onClick={onChangeWeight}
            className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-200 underline-offset-4 hover:text-amber-300 hover:underline"
          >
            Recalibrate weight
          </button>
        </div>
      </div>
    </div>
  );
}

function TimerCard({
  elapsedMs,
  isRunning,
  hasStarted,
  onStart,
}: {
  elapsedMs: number;
  isRunning: boolean;
  hasStarted: boolean;
  onStart: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-amber-500/20 bg-neutral-950/80 p-5">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
        <div className="h-px w-full animate-scan bg-amber-400" />
      </div>
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`grid h-9 w-9 place-items-center rounded-md border ${
              isRunning
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-glow-amber animate-flicker"
                : "border-neutral-800 bg-neutral-900 text-neutral-500"
            }`}
          >
            <Timer className="h-4 w-4" />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-neutral-300">
              {hasStarted ? (isRunning ? "Clock running" : "Clock stopped") : "Standby"}
            </p>
            <p
              className={`font-display text-3xl font-black tabular-nums sm:text-4xl ${
                isRunning ? "text-amber-400" : "text-neutral-200"
              }`}
            >
              {formatTime(elapsedMs)}
            </p>
          </div>
        </div>
        <div className="flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
          {!hasStarted && (
            <button
              onClick={onStart}
              className="rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-200 transition hover:bg-amber-500/20 hover:shadow-glow-amber"
            >
              Start Timer
            </button>
          )}
          <p className="max-w-[16rem] text-left font-mono text-[11px] uppercase leading-relaxed tracking-[0.12em] text-neutral-400 sm:text-right sm:text-xs sm:tracking-[0.16em]">
            Timer auto-starts on first rep. Stops only when both tracks max out.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressGraph({
  sessionResults,
  liveAttempt,
  onExportResults,
  onImportResults,
}: {
  sessionResults: SessionResult[];
  liveAttempt: SessionResult | null;
  onExportResults: () => void;
  onImportResults: (jsonText: string) => void;
}) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const storedHistory = sessionResults.slice(-20);
  const history = liveAttempt
    ? [...storedHistory.slice(-19), liveAttempt]
    : storedHistory;
  const historyW = 860;
  const historyH = 220;
  const historyP = 24;
  const historyMaxMs = Math.max(
    ...history.map((item) => item.durationMs),
    bestOf(history),
    1
  );
  const bestHistoryMs = bestOf(history);

  const hx = (idx: number) =>
    history.length <= 1
      ? historyP
      : historyP + (idx / (history.length - 1)) * (historyW - historyP * 2);
  const hy = (ms: number) =>
    historyH - historyP - (ms / historyMaxMs) * (historyH - historyP * 2);
  const historyPath = history
    .map((item, i) => `${i === 0 ? "M" : "L"} ${hx(i)} ${hy(item.durationMs)}`)
    .join(" ");

  return (
    <div className="space-y-4 rounded-lg border border-neutral-900 bg-neutral-950/70 p-3 sm:p-5">
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-xl font-bold uppercase tracking-wide text-neutral-100">
          Progress
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportResults}
            className="rounded-md border border-neutral-700 bg-neutral-900/70 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-neutral-100 transition hover:border-emerald-500/50 hover:text-emerald-300"
          >
            Export
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="rounded-md border border-neutral-700 bg-neutral-900/70 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-neutral-100 transition hover:border-amber-500/50 hover:text-amber-300"
          >
            Import
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const text = String(reader.result ?? "");
                onImportResults(text);
              };
              reader.readAsText(file);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      <div className="rounded-md border border-neutral-900 bg-neutral-950/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-200">
            All Results History ({history.length})
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">
            Best {bestHistoryMs ? formatTime(bestHistoryMs) : "--:--"}
          </p>
        </div>
        {history.length === 0 ? (
          <div className="grid h-36 place-items-center rounded-md border border-dashed border-neutral-800 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-300">
              Start a session, then hit Reset Session or complete the challenge to log a result.
            </p>
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${historyW} ${historyH}`}
              className="h-40 w-full sm:h-44"
              role="img"
              aria-label="All results history chart"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const gy = hy(historyMaxMs * ratio);
                return (
                  <line
                    key={`hy-${ratio}`}
                    x1={historyP}
                    y1={gy}
                    x2={historyW - historyP}
                    y2={gy}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1"
                  />
                );
              })}
              {bestHistoryMs > 0 && (
                <line
                  x1={historyP}
                  y1={hy(bestHistoryMs)}
                  x2={historyW - historyP}
                  y2={hy(bestHistoryMs)}
                  stroke="rgba(16,185,129,0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}
              {historyPath && (
                <path
                  d={historyPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}
              {history.map((item, i) => (
                <circle
                  key={`${item.completedAt}-${i}`}
                  cx={hx(i)}
                  cy={hy(item.durationMs)}
                  r="4.5"
                  fill={item.isCompleted ? "#10b981" : "#f59e0b"}
                />
              ))}
            </svg>
            <div className="mt-1 flex items-center justify-between px-1 font-mono text-xs uppercase tracking-[0.2em] text-neutral-300">
              <span>First</span>
              <span>Latest</span>
            </div>
            <div className="mt-2 flex items-center gap-4 font-mono text-xs uppercase tracking-[0.18em] text-neutral-200">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Completed
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Partial
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function bestOf(results: SessionResult[]): number {
  if (results.length === 0) return 0;
  return results.reduce((best, item) => Math.min(best, item.durationMs), results[0].durationMs);
}

interface RepTrackProps {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  reps: number;
  target: number;
  weight: number;
  onIncrement: () => void;
  onDecrement: () => void;
  isActive: boolean;
  onSelect: () => void;
}

function RepTrack({
  label,
  subtitle,
  icon,
  reps,
  target,
  weight,
  onIncrement,
  onDecrement,
  isActive,
  onSelect,
}: RepTrackProps) {
  const pct = target === 0 ? 0 : Math.min(100, (reps / target) * 100);
  const done = reps >= target && target > 0;
  const liftedKg = Math.round(reps * weight);
  const remaining = Math.max(0, target - reps);

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`relative w-full overflow-hidden rounded-lg border bg-neutral-950/70 p-4 text-left transition sm:p-5 ${
        done
          ? "border-emerald-500/40 shadow-glow-emerald"
          : isActive
            ? "border-amber-500/45"
            : "border-neutral-900"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`grid h-9 w-9 place-items-center rounded-md border transition ${
              done
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-400"
            }`}
          >
            {icon}
          </div>
          <div>
            <p className="font-display text-lg font-bold uppercase tracking-wider text-neutral-100">
              {label}
            </p>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-300">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-300">
            Reps
          </p>
          <p
            className={`font-display text-3xl font-black tabular-nums ${
              done ? "text-emerald-400" : "text-neutral-100"
            }`}
          >
            {reps}
            <span className="text-neutral-300">/{target}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3 sm:mt-5 sm:gap-4">
        <VerticalProgress pct={pct} done={done} />

        <div className="flex flex-1 flex-col justify-between gap-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-md border border-neutral-900 bg-neutral-950 p-2">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-300">
                Lifted
              </p>
              <p
                className={`font-display text-base font-bold ${
                  done ? "text-emerald-400" : "text-neutral-100"
                }`}
              >
                {liftedKg.toLocaleString()}
                <span className="ml-1 text-xs font-mono text-neutral-300">
                  kg
                </span>
              </p>
            </div>
            <div className="rounded-md border border-neutral-900 bg-neutral-950 p-2">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-300">
                Left
              </p>
              <p className="font-display text-base font-bold text-amber-400">
                {remaining}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onDecrement}
              disabled={reps === 0}
              aria-label={`Decrement ${label}`}
              className="grid h-12 w-12 place-items-center rounded-md border border-neutral-900 bg-neutral-950 text-neutral-300 transition hover:border-neutral-700 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Minus className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <button
              onClick={onIncrement}
              disabled={done}
              aria-label={`Add rep to ${label}`}
              className={`group relative flex min-h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-md border px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] transition sm:tracking-[0.35em] ${
                done
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:shadow-glow-amber active:scale-[0.98]"
              } disabled:cursor-not-allowed`}
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-300/20 to-transparent transition group-active:translate-x-full" />
              {done ? "Locked" : "+1 Rep"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerticalProgress({ pct, done }: { pct: number; done: boolean }) {
  return (
    <div className="relative h-40 w-9 shrink-0 overflow-hidden rounded-md border border-neutral-900 bg-neutral-950 sm:h-44 sm:w-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-full">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-px bg-neutral-900"
            style={{ top: `${((i + 1) / 10) * 100}%` }}
          />
        ))}
      </div>
      <motion.div
        className={`absolute inset-x-0 bottom-0 ${
          done
            ? "bg-gradient-to-t from-emerald-500 via-emerald-400 to-emerald-300 shadow-glow-emerald"
            : "bg-gradient-to-t from-amber-600 via-amber-500 to-amber-300 shadow-glow-amber"
        }`}
        initial={false}
        animate={{ height: `${pct}%` }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
      >
        <div className="absolute inset-x-0 top-0 h-3 bg-white/30 blur-md" />
      </motion.div>
      <div className="absolute inset-0 flex items-end justify-center pb-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-950 mix-blend-difference">
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

interface CompleteOverlayProps {
  elapsedMs: number;
  isNewPB: boolean;
  bestMs: number | null;
  targetReps: number;
  weight: number;
  onReset: () => void;
  onChangeWeight: () => void;
}

function CompleteOverlay({
  elapsedMs,
  isNewPB,
  bestMs,
  targetReps,
  weight,
  onReset,
  onChangeWeight,
}: CompleteOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 grid place-items-center bg-grit-950/90 px-3 backdrop-blur-md sm:px-4"
    >
      <motion.div
        initial={{ scale: 0.92, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl border border-emerald-500/40 bg-gradient-to-b from-neutral-950 to-neutral-900 p-4 shadow-glow-emerald sm:p-8"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
        <div className="pointer-events-none absolute -inset-1 opacity-30">
          <div className="absolute inset-0 animate-flicker bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_60%)]" />
        </div>

        <div className="relative text-center">
          <motion.div
            initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
            className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-glow-emerald"
          >
            <Trophy className="h-8 w-8" strokeWidth={2.25} />
          </motion.div>

          <p className="font-mono text-[11px] uppercase tracking-[0.5em] text-emerald-400/80">
            Status&nbsp;//&nbsp;Mission Complete
          </p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-tight text-neutral-100 sm:text-5xl">
            Challenge <span className="text-emerald-400">Complete</span>
          </h2>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">
            {targetReps}×Pull-ups · {targetReps}×Dips ·{" "}
            <span className="text-emerald-400">5,000 kg</span> moved at {weight}{" "}
            kg BW
          </p>

          <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-950 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-neutral-500">
              Total Time
            </p>
            <p className="mt-1 font-display text-4xl font-black tabular-nums text-amber-400 sm:text-6xl">
              {formatTime(elapsedMs)}
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
              Personal Best:{" "}
              <span className="text-emerald-400">
                {bestMs ? formatTime(bestMs) : "—"}
              </span>
            </p>
          </div>

          <AnimatePresence>
            {isNewPB && (
              <motion.div
                initial={{ scale: 0.7, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 240, damping: 18 }}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-emerald-300 shadow-glow-emerald sm:px-4 sm:tracking-[0.4em]"
              >
                <Flame className="h-3.5 w-3.5" />
                New PB Set
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 flex flex-col gap-2 sm:mt-7 sm:flex-row">
            <button
              onClick={onReset}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.22em] text-amber-300 transition hover:bg-amber-500/20 hover:shadow-glow-amber sm:tracking-[0.3em]"
            >
              <RotateCcw className="h-4 w-4" />
              Run It Back
            </button>
            <button
              onClick={onChangeWeight}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-neutral-800 bg-neutral-950 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.22em] text-neutral-300 transition hover:border-neutral-600 hover:text-neutral-100 sm:tracking-[0.3em]"
            >
              Change Weight
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
