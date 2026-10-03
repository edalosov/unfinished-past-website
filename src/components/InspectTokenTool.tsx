"use client";

import { useState } from "react";

export function InspectTokenTool() {
  const [tokenId, setTokenId] = useState("");
  const [busy, setBusy] = useState<"inspect" | "refresh" | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleInspect() {
    if (!tokenId) return;
    setBusy("inspect");
    setResult(null);

    try {
      const res = await fetch("/api/admin/inspect-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId }),
      });
      const data = await res.json().catch(() => ({ error: `Failed to inspect token (HTTP ${res.status})` }));
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRefresh() {
    if (!tokenId) return;
    setBusy("refresh");
    setResult(null);

    try {
      const res = await fetch("/api/admin/refresh-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setResult(data.error || `Failed to refresh token (HTTP ${res.status})`);
        return;
      }
    } catch {
      setResult("Could not reach the server. Check your connection and try again.");
      setBusy(null);
      return;
    }

    // Alchemy's refresh resolves once its own cache is updated, so
    // inspecting right after shows the result of the refresh immediately.
    await handleInspect();
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>
        Inspect a token
      </h2>
      <p className="text-xs" style={{ color: "var(--foreground-faint)" }}>
        Shows everything Alchemy has on file for one token&apos;s image, plus the raw metadata it was parsed
        from — useful for figuring out why a specific piece is showing up wrong. If the metadata behind a
        token changed (e.g. the image was swapped in-place) but Alchemy hasn&apos;t noticed yet, use Refresh
        to make it re-check, then Inspect to confirm.
      </p>
      <div className="flex gap-3">
        <input
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          placeholder="Token ID, e.g. 94"
          className="rounded-md border bg-transparent px-4 py-3 font-mono text-sm text-foreground outline-none focus:border-[var(--accent)]"
          style={{ borderColor: "var(--border-soft)" }}
        />
        <button
          type="button"
          onClick={handleInspect}
          disabled={busy !== null || !tokenId}
          className="gallery-connect-btn disabled:opacity-40"
        >
          {busy === "inspect" ? "Looking…" : "Inspect"}
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={busy !== null || !tokenId}
          className="gallery-connect-btn disabled:opacity-40"
        >
          {busy === "refresh" ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {result && (
        <pre
          className="overflow-x-auto rounded-md border p-4 text-xs"
          style={{ borderColor: "var(--border-soft)", color: "var(--foreground-muted)" }}
        >
          {result}
        </pre>
      )}
    </section>
  );
}
