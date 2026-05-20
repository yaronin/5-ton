import { STORAGE_RESULTS } from "@/lib/storageKeys";

export async function tryMergeLocalHistory(): Promise<void> {
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
