"use client";

import { useState } from "react";

export function RefreshImagesTool() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleRefresh() {
    setBusy(true);
    setStatus("Asking Alchemy to re-cache every piece in the collection…");

    const res = await fetch("/api/admin/refresh-images", { method: "POST" });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data.error || "Failed to refresh images");
      return;
    }

    const data = await res.json();
    setStatus(
      `Triggered a refresh for ${data.refreshed} of ${data.total} token${data.total === 1 ? "" : "s"}. ` +
        "Alchemy takes a few minutes to re-crawl each one — reload the gallery shortly to check.",
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>
        Images
      </h2>
      <p className="text-xs" style={{ color: "var(--foreground-faint)" }}>
        Walks every token in the collection and asks Alchemy to re-fetch its image, instead of waiting for
        someone to view a broken piece first. Worth running once right after pointing at a new contract. A
        token Alchemy already refreshed in the last 15 minutes is skipped by their own cooldown, not an error
        here.
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
