"use client";

import { useState } from "react";

export function InspectTokenTool() {
  const [tokenId, setTokenId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleInspect() {
    if (!tokenId) return;
    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>
        Inspect a token
      </h2>
      <p className="text-xs" style={{ color: "var(--foreground-faint)" }}>
        Shows everything Alchemy has on file for one token&apos;s image, plus the raw metadata it was parsed
        from — useful for figuring out why a specific piece is showing up wrong.
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
          disabled={busy || !tokenId}
          className="gallery-connect-btn disabled:opacity-40"
        >
          {busy ? "Looking…" : "Inspect"}
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
