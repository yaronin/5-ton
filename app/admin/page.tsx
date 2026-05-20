"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { AccountUser } from "@/lib/account";
import { formatTime } from "@/lib/formatTime";

type AdminUserRow = {
  id: number;
  email: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: number;
  attemptCount: number;
  bestMs: number | null;
  lastActivityAt: number | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [adminAllowed, setAdminAllowed] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editPending, setEditPending] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/users", { credentials: "include" });
    if (res.status === 403) {
      setError("You need to be signed in as an admin.");
      setUsers(null);
      return;
    }
    if (!res.ok) {
      setError("Could not load users.");
      setUsers(null);
      return;
    }
    const data = (await res.json()) as { users?: AdminUserRow[] };
    setUsers(Array.isArray(data.users) ? data.users : []);
  }, []);

  useEffect(() => {
    if (adminAllowed) void load();
  }, [load, adminAllowed]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { user?: AccountUser | null }) => {
        const u = d.user ?? null;
        if (!u?.isAdmin) {
          router.replace("/");
          return;
        }
        setAdminAllowed(true);
        setMyUserId(u.id);
      })
      .catch(() => router.replace("/"));
  }, [router]);

  const openEdit = (u: AdminUserRow) => {
    setEditUser(u);
    setEditEmail(u.email);
    setEditDisplayName(u.displayName);
    setEditIsAdmin(u.isAdmin);
    setEditNewPassword("");
    setEditShowPassword(false);
    setEditError(null);
  };

  const closeEdit = () => {
    setEditUser(null);
    setEditError(null);
    setEditPending(false);
  };

  const submitEdit = async () => {
    if (!editUser) return;
    setEditError(null);
    setEditPending(true);
    try {
      const body: Record<string, unknown> = {
        email: editEmail.trim(),
        displayName: editDisplayName.trim(),
        isAdmin: editIsAdmin,
      };
      if (editNewPassword.trim().length > 0) {
        body.newPassword = editNewPassword;
      }
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setEditError(data.error ?? "Update failed.");
        return;
      }
      closeEdit();
      await load();
    } finally {
      setEditPending(false);
    }
  };

  const deleteUser = async (u: AdminUserRow) => {
    const ok = window.confirm(
      `Delete user ${u.email} (id ${u.id})? This cannot be undone. All their session results will be removed.`
    );
    if (!ok) return;
    setError(null);
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Delete failed.");
      return;
    }
    await load();
  };

  const adminCount = users?.filter((u) => u.isAdmin).length ?? 0;

  if (!adminAllowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-950 font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-amber-300">
              Admin // Dashboard
            </p>
            <h1 className="font-display text-2xl font-black uppercase tracking-wide sm:text-3xl">
              Athletes &amp; attempts
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] text-neutral-200 hover:border-amber-500/50"
            >
              Refresh
            </button>
            <Link
              href="/"
              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] text-amber-200 hover:bg-amber-500/20"
            >
              Back to app
            </Link>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 font-mono text-sm text-red-200">
            {error}
          </p>
        )}

        {users && (
          <div className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900/40">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-800 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  <th className="px-3 py-2">Id</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Display</th>
                  <th className="px-3 py-2">Admin</th>
                  <th className="px-3 py-2">Attempts</th>
                  <th className="px-3 py-2">Best</th>
                  <th className="px-3 py-2">Last activity</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const disableDelete =
                    u.id === myUserId ||
                    (u.isAdmin && adminCount <= 1);
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-neutral-900 font-mono text-xs text-neutral-200 last:border-0"
                    >
                      <td className="px-3 py-2 tabular-nums">{u.id}</td>
                      <td className="max-w-[11rem] truncate px-3 py-2">
                        {u.email}
                      </td>
                      <td className="max-w-[8rem] truncate px-3 py-2">
                        {u.displayName}
                      </td>
                      <td className="px-3 py-2">{u.isAdmin ? "yes" : "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{u.attemptCount}</td>
                      <td className="px-3 py-2 tabular-nums text-emerald-400">
                        {u.bestMs != null ? formatTime(u.bestMs) : "—"}
                      </td>
                      <td className="px-3 py-2 text-neutral-400">
                        {u.lastActivityAt != null
                          ? new Date(u.lastActivityAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-200 hover:border-amber-500/60"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={disableDelete}
                            title={
                              u.id === myUserId
                                ? "You cannot delete your own account"
                                : u.isAdmin && adminCount <= 1
                                  ? "Cannot delete the only admin"
                                  : undefined
                            }
                            onClick={() => void deleteUser(u)}
                            className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editUser && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3 py-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
          >
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
                    Edit user
                  </p>
                  <h2
                    id="edit-user-title"
                    className="font-display text-lg font-bold text-neutral-100"
                  >
                    #{editUser.id}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-md border border-neutral-700 px-2 py-1 font-mono text-[10px] uppercase text-neutral-300 hover:bg-neutral-800"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3" data-auth-modal>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    Email
                  </span>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-amber-500/50"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    Display name
                  </span>
                  <input
                    type="text"
                    maxLength={40}
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-amber-500/50"
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={editIsAdmin}
                    onChange={(e) => setEditIsAdmin(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-amber-500"
                  />
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-neutral-300">
                    Admin access
                  </span>
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    New password (optional)
                  </span>
                  <input
                    type={editShowPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPassword((v) => !v)}
                    className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-900 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300 hover:bg-neutral-800"
                  >
                    {editShowPassword ? "Hide password" : "Show password"}
                  </button>
                </label>
                {editError && (
                  <p className="font-mono text-xs text-red-300">{editError}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => void submitEdit()}
                    disabled={editPending}
                    className="flex-1 rounded-md border border-amber-500/40 bg-amber-500/15 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
                  >
                    {editPending ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2.5 font-mono text-xs uppercase text-neutral-300 hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
