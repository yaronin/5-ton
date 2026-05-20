"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import type { AccountUser } from "@/lib/account";

type Props = {
  user: AccountUser;
};

export function UserMenu({ user }: Props) {
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    window.location.href = "/login";
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
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
        onClick={() => void logout()}
        className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-950/70 px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-200 transition hover:border-neutral-600 hover:text-white sm:px-3 sm:text-xs"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Log out</span>
      </button>
    </div>
  );
}
