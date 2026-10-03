"use client";

import { useState } from "react";

export function RefreshImagesTool() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleRefresh() {
    setBusy(true);
    setStatus("Asking Alchemy to re-ingest the whole collection…");

    try {
      const res = await fetch("/api/admin/refresh-images", { method: "POST" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(data.error || `Failed to refresh images (HTTP ${res.status})`);
        return;
      }

      const data: { refreshState: string; progress: string | null } = await res.json();
      const messages: Record<string, string> = {
        does_not_exist: "Alchemy doesn't recognize this contract — double-check the address.",
        already_queued: "Already queued for re-ingestion — check back shortly.",
        in_progress: `Re-ingestion in progress${data.progress ? ` (${data.progress}% done)` : ""}. Click again in a minute to check progress.`,
        finished: "Re-ingestion finished. Reload the gallery to check.",
      };
      setStatus(messages[data.refreshState] || `Status: ${data.refreshState}`);
    } catch {
      setStatus("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>
        Images
      </h2>
      <p className="text-xs" style={{ color: "var(--foreground-faint)" }}>
        Asks Alchemy to fully re-ingest the whole collection from the original source, instead of waiting for
        someone to view a broken piece first. Worth running once right after pointing at a new contract. This
        runs as a background job on Alchemy&apos;s side — it can take a little while for a large collection, so
        click again to check progress.
      </p>
      <button type="button" onClick={handleRefresh} disabled={busy} className="gallery-connect-btn self-start disabled:opacity-40">
        {busy ? "Refreshing…" : "Refresh all images"}
      </button>
      {status && (
        <p className="text-sm" style={{ color: "var(--accent)" }}>
          {status}
        </p>
      )}
    </section>
  );
}
