"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { AnswerPanel, type YearEntry } from "@/components/AnswerPanel";
import { VerifyWalletPrompt } from "@/components/VerifyWalletPrompt";
import { useWalletVerification } from "@/hooks/useWalletVerification";
import { useFallbackImage } from "@/hooks/useFallbackImage";
import type { OwnedToken } from "@/lib/alchemy";

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      token: OwnedToken;
      years: YearEntry[];
    };

// Shared between the full-page route (app/art/[tokenId]/page.tsx, used on
// direct navigation/refresh/shared links) and the intercepted modal route
// (app/@modal/(.)art/[tokenId]/page.tsx, used when opened from the grid) —
// `className` lets each wrapper control sizing without duplicating the
// fetch/loading/error logic.
export function ArtworkDetail({
  tokenId,
  className = "flex min-h-[100dvh] flex-col lg:h-[100dvh] lg:flex-row",
  onBack,
}: {
  tokenId: string;
  className?: string;
  // When set (the intercepted modal route), "Back to collection" calls this
  // instead of navigating to "/" — passed as router.back(), matching the
  // modal backdrop's click-to-dismiss behavior exactly. The full-page route
  // has no guaranteed prior history entry (direct link/refresh), so it
  // leaves this unset and falls back to a plain Link.
  onBack?: () => void;
}) {
  const router = useRouter();
  const { isConnected, status: accountStatus } = useAccount();
  const { status: verification, error: verifyError, verify } = useWalletVerification();
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const imageCandidates = state.status === "ready" ? state.token.images : [];
  const {
    src: imageSrc,
    failed: imageFailed,
    hasCandidates: imageHasCandidates,
    loaded: imageLoaded,
    onLoad: onImageLoad,
    onError: onImageError,
  } = useFallbackImage(imageCandidates, tokenId);
  const reportedImageFailure = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    // Covers both cases that mean Alchemy's cached metadata is stale: every
    // candidate failing to load (imageFailed), and Alchemy never having
    // cached any image URL for this token at all (!imageHasCandidates).
    if ((!imageFailed && imageHasCandidates) || reportedImageFailure.current) return;
    reportedImageFailure.current = true;
    fetch(`/api/art/${tokenId}/refresh-image`, { method: "POST" }).catch(() => {});
  }, [imageFailed, imageHasCandidates, tokenId]);

  useEffect(() => {
    // On a fresh page load (direct link, refresh), wagmi's wallet reconnect
    // is asynchronous, and accountStatus can read "disconnected" for a
    // moment before settling into "reconnecting"/"connected" — even with
    // ssr: true on the wagmi config. Give it a beat before treating
    // "disconnected" as final and bouncing to the grid.
    if (accountStatus !== "disconnected") return;
    const timeout = setTimeout(() => router.replace("/"), 1000);
    return () => clearTimeout(timeout);
  }, [accountStatus, router]);

  useEffect(() => {
    if (verification !== "verified") return;

    let cancelled = false;
    // Reset to loading whenever the token changes, before the fetch below resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });
    reportedImageFailure.current = false;

    fetch(`/api/art/${tokenId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load artwork");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setState({ status: "ready", token: data.token, years: data.years });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [tokenId, verification]);

  useEffect(() => {
    // Only relevant once the panel (and its scroll sentinel) actually
    // exists — shows a "there's more below" fade whenever the end of the
    // panel isn't in view yet, and hides it once scrolled into view or if
    // the content never overflowed in the first place.
    if (state.status !== "ready") return;
    const container = scrollContainerRef.current;
    const sentinel = scrollEndRef.current;
    if (!container || !sentinel) return;

    const observer = new IntersectionObserver(([entry]) => setShowScrollHint(!entry.isIntersecting), {
      root: container,
      threshold: 1,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [state.status]);

  if (!isConnected) {
    return null;
  }

  if (verification !== "verified") {
    return <VerifyWalletPrompt status={verification} error={verifyError} onVerify={verify} />;
  }

  // Deliberately absolute, not fixed — inside the modal, framer-motion's
  // inline transform on the animated panel ancestor creates a new
  // containing block, so a `fixed` child here would end up positioned
  // relative to that panel instead of the viewport. Anchoring to the
  // nearest positioned ancestor (the `relative` wrapper below) lands in
  // the same visual spot either way: the top-left corner of the panel on
  // the modal route, or the page itself on the full-page route.
  const backControl = onBack ? (
    <button
      onClick={onBack}
      className="gallery-connect-btn gallery-connect-btn--overlay absolute left-5 top-5 z-[60] sm:left-8 sm:top-8"
    >
      ← Back to collection
    </button>
  ) : (
    <Link
      href="/"
      className="gallery-connect-btn gallery-connect-btn--overlay absolute left-5 top-5 z-[60] sm:left-8 sm:top-8"
    >
      ← Back to collection
    </Link>
  );

  if (state.status === "loading") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex min-h-full w-full items-center justify-center"
      >
        {backControl}
        <p className="text-sm font-light" style={{ color: "var(--foreground-faint)" }}>
          Loading…
        </p>
      </motion.div>
    );
  }

  if (state.status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex min-h-full w-full flex-col items-center justify-center gap-4 px-6 text-center"
      >
        {backControl}
        <p className="text-sm font-light" style={{ color: "var(--foreground-faint)" }}>
          {state.message}
        </p>
      </motion.div>
    );
  }

  const { token, years } = state;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className={`relative ${className}`}
    >
      {backControl}
      <div className="flex w-full items-center justify-center bg-[var(--background-elevated)] p-6 pt-24 lg:w-2/3 lg:p-16">
        {imageSrc ? (
          // Wrapping div carries the fade so framer-motion's `animate`
          // prop drives it — that's always guaranteed to play a
          // transition on change, unlike a raw CSS transition tied to
          // inline style + React state, which can silently collapse into
          // an instant jump for a cached image. Every piece in the
          // collection is meant to be 16:9, so the stage is fixed to that
          // ratio (shrinking within max-h-[80vh] as needed), but
          // object-contain (not cover) means a piece that isn't
          // pixel-exact never gets cropped — it just letterboxes instead.
          <motion.div
            key={imageSrc}
            initial={{ opacity: 0 }}
            animate={{ opacity: imageLoaded ? 1 : 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="aspect-video max-h-[80vh] w-full max-w-full"
          >
            <Image
              src={imageSrc}
              alt={token.name}
              width={1600}
              height={900}
              unoptimized
              onLoad={onImageLoad}
              onError={onImageError}
              className="h-full w-full object-contain"
            />
          </motion.div>
        ) : (
          <div className="text-sm" style={{ color: "var(--foreground-faint)" }}>
            {imageFailed ? "Image unavailable" : "No image"}
          </div>
        )}
      </div>

      <div
        className="relative w-full border-t lg:h-full lg:w-1/3 lg:border-l lg:border-t-0"
        style={{ borderColor: "var(--border-soft)" }}
      >
        <div ref={scrollContainerRef} className="no-scrollbar h-full w-full lg:overflow-y-auto">
          <div className="px-6 pt-24 sm:px-10 lg:pt-16">
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{token.name}</h1>
          </div>

          <AnswerPanel tokenId={token.tokenId} years={years} />
          <div ref={scrollEndRef} className="h-px" />
        </div>

        {showScrollHint && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-16 lg:block"
            style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }}
          />
        )}
      </div>
    </motion.div>
  );
}
