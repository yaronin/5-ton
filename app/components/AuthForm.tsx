"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";

import { tryMergeLocalHistory } from "@/lib/mergeLocalHistory";

type AuthMode = "login" | "register";

type Props = {
  redirectTo?: string;
  defaultMode?: AuthMode;
  mergeLocalOnSuccess?: boolean;
};

export function AuthForm({
  redirectTo = "/",
  defaultMode = "login",
  mergeLocalOnSuccess = true,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      if (mergeLocalOnSuccess) {
        await tryMergeLocalHistory();
      }
      const dest =
        redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : "/";
      router.push(dest);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const switchMode = useCallback((next: AuthMode) => {
    setMode(next);
    setError(null);
    setPassword("");
    setShowPassword(false);
  }, []);

  return (
    <div
      data-auth-modal
      className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl"
    >
      <div className="mb-4">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-amber-300">
          {mode === "register" ? "Create account" : "Welcome back"}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold uppercase tracking-wide text-neutral-100">
          Sign in to continue
        </h2>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
          The 5-ton challenge requires an account
        </p>
      </div>

      <div className="mb-4 inline-flex w-full rounded-md border border-neutral-800 bg-neutral-900/60 p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`flex-1 rounded px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] transition ${
            mode === "login"
              ? "bg-amber-500/20 text-amber-300"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={`flex-1 rounded px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] transition ${
            mode === "register"
              ? "bg-emerald-500/20 text-emerald-300"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Register
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
              mode === "login" ? "admin or admin@five-ton.local" : undefined
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
            autoComplete={mode === "register" ? "new-password" : "current-password"}
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
        {error && <p className="font-mono text-xs text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md border border-amber-500/40 bg-amber-500/15 py-3 font-mono text-xs font-bold uppercase tracking-[0.22em] text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-50"
        >
          {pending
            ? "Please wait…"
            : mode === "register"
              ? "Create account"
              : "Log in"}
        </button>
      </form>
    </div>
  );
}
