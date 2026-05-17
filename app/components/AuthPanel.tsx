"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { LogIn, LogOut, UserPlus } from "lucide-react";

import { STORAGE_RESULTS } from "@/lib/storageKeys";

export type AccountUser = {
  id: number;
  email: string;
  displayName: string;
  isAdmin: boolean;
};

type Props = {
  user: AccountUser | null;
  onSessionChange: () => void;
};

async function tryMergeLocalHistory(): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_RESULTS);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    const ok = window.confirm(
      "Upload your local session history from this browser to your account?"
    );
    if (!ok) return;
    const res = await fetch("/api/results/bulk", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: parsed }),
    });
    const data = (await res.json().catch(() => ({}))) as { imported?: number };
    if (res.ok) {
      window.alert(`Uploaded ${data.imported ?? 0} session row(s).`);
    } else {
      window.alert("Could not upload history.");
    }
  } catch {
    window.alert("Could not upload history.");
  }
}

export function AuthPanel({ user, onSessionChange }: Props) {
  const [mode, setMode] = useState<null | "login" | "register">(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const close = useCallback(() => {
    setMode(null);
    setError(null);
    setPassword("");
    setShowPassword(false);
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body =
        mode === "register"
          ? { email, password, displayName }
          : { email, password };
      let res: Response;
      try {
        res = await fetch(path, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (fetchErr) {
        console.error(fetchErr);
        setError(
          "Network error — could not reach the server. If this persists, unregister the site service worker (Application tab) or hard-refresh, then try again."
        );
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        const parts = [data.error, data.detail].filter(Boolean);
        setError(parts.join(" — ") || "Something went wrong.");
        return;
      }
      close();
      setEmail("");
      setDisplayName("");
      onSessionChange();
      await tryMergeLocalHistory();
    } finally {
      setPending(false);
    }
  };

  const logout = async () => {
    setPending(true);
    try {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch {
        // ignore network errors on logout
      }
      onSessionChange();
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {user ? (
          <>
            <span className="hidden max-w-[10rem] truncate font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-400 sm:inline">
              {user.displayName}
            </span>
            {user.isAdmin && (
              <Link
                href="/admin"
                className="rounded-md border border-neutral-800 bg-neutral-950/70 px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-200 transition hover:border-amber-500/40 hover:text-amber-300 sm:px-3 sm:text-xs"
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => void logout()}
              className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-950/70 px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-200 transition hover:border-neutral-600 hover:text-white disabled:opacity-50 sm:px-3 sm:text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-950/70 px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-200 transition hover:border-emerald-500/40 hover:text-emerald-300 sm:px-3 sm:text-xs"
            >
              <LogIn className="h-3.5 w-3.5" />
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-amber-200 transition hover:bg-amber-500/20 sm:px-3 sm:text-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Register
            </button>
          </>
        )}
      </div>

      {mode && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 px-3 backdrop-blur-sm">
          <div
          data-auth-modal
          className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl"
        >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-amber-300">
                  {mode === "register" ? "Create account" : "Welcome back"}
                </p>
                <h2 className="mt-1 font-display text-xl font-bold uppercase tracking-wide text-neutral-100">
                  {mode === "register" ? "Register" : "Log in"}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-neutral-800 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-neutral-200 hover:border-neutral-600"
              >
                Close
              </button>
            </div>

            <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  {mode === "login" ? "Email or admin" : "Email"}
                </span>
                <input
                  type={mode === "login" ? "text" : "email"}
                  autoComplete={mode === "login" ? "username" : "email"}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    mode === "login"
                      ? "admin or admin@five-ton.local"
                      : undefined
                  }
                  className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-amber-500/50"
                />
              </label>
              {mode === "register" && (
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    Display name
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-amber-500/50"
                  />
                </label>
              )}
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  Password
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  required
                  minLength={mode === "register" ? 8 : 1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-amber-500/50"
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPassword((v) => !v);
                  }}
                  className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-center font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amber-300 transition hover:border-amber-500/50 hover:bg-neutral-800 hover:text-amber-200"
                >
                  {showPassword ? "Hide password" : "Show password"}
                </button>
              </label>
              {error && (
                <p className="font-mono text-xs text-red-300">{error}</p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md border border-amber-500/40 bg-amber-500/15 py-3 font-mono text-xs font-bold uppercase tracking-[0.22em] text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-50"
              >
                {pending ? "Please wait…" : mode === "register" ? "Create account" : "Log in"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
