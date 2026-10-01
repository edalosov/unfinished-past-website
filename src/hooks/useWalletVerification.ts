"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { buildSignInMessage } from "@/lib/authMessage";
import { isUserRejection } from "@/lib/walletErrors";

export type VerificationStatus =
  | "idle"
  | "checking"
  | "needs-signature"
  | "signing"
  | "verified"
  | "error";

// Proves the connected wallet controls `address` before any personal data
// (owned NFTs, answer history) is fetched from the server, via a free,
// gas-less signature — server-side session lives in the `unfinishedpast_wallet_session`
// cookie (see src/lib/walletSession.ts).
export function useWalletVerification() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const wasConnected = useRef(false);

  const verify = useCallback(async () => {
    if (!address) return;
    setError(null);
    setStatus("signing");

    try {
      const timestamp = Date.now();
      const message = buildSignInMessage({ walletAddress: address, timestamp });
      const signature = await signMessageAsync({ message });

      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, timestamp, signature }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Verification failed");
      }

      setStatus("verified");
    } catch (err) {
      setError(isUserRejection(err) ? "Request rejected. Please try again." : err instanceof Error ? err.message : "Verification failed");
      setStatus("needs-signature");
    }
  }, [address, signMessageAsync]);

  useEffect(() => {
    if (!isConnected || !address) {
      // Reset whenever the wallet disconnects, before any fetch below would run.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("idle");
      return;
    }

    const normalized = address.toLowerCase();
    let cancelled = false;
    setStatus("checking");

    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { walletAddress: string | null }) => {
        if (cancelled) return;
        setStatus(data.walletAddress === normalized ? "verified" : "needs-signature");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("needs-signature");
      });

    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  useEffect(() => {
    if (wasConnected.current && !isConnected) {
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    }
    wasConnected.current = isConnected;
  }, [isConnected]);

  return { status, error, verify };
}
