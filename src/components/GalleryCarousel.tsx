"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useFallbackImage } from "@/hooks/useFallbackImage";
import type { OwnedToken } from "@/lib/alchemy";

function ArrowButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Previous piece" : "Next piece"}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-foreground transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] sm:h-12 sm:w-12"
      style={{ borderColor: "var(--border-soft)" }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d={direction === "prev" ? "M10 3L5 8L10 13" : "M6 3L11 8L6 13"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function CarouselSlide({ token, answered }: { token: OwnedToken; answered?: boolean }) {
  const { src, failed, loaded, onLoad, onError } = useFallbackImage(token.images, token.tokenId);
  const reported = useRef(false);

  useEffect(() => {
    if (!failed || reported.current) return;
    reported.current = true;
    fetch(`/api/art/${token.tokenId}/refresh-image`, { method: "POST" }).catch(() => {});
  }, [failed, token.tokenId]);

  return (
    <Link href={`/art/${token.tokenId}`} className="group block">
      <div
        className="w-full overflow-hidden border"
        style={{ borderColor: "var(--border-soft)", background: "var(--background-elevated)" }}
      >
        {src ? (
          <motion.img
            src={src}
            alt={token.name}
            onLoad={onLoad}
            onError={onError}
            initial={{ opacity: 0 }}
            animate={{ opacity: loaded ? 1 : 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="block aspect-video w-full object-cover"
          />
        ) : (
          <div
            className="flex aspect-video w-full items-center justify-center text-xs"
            style={{ color: "var(--foreground-faint)" }}
          >
            {failed ? "Image unavailable" : "No image"}
          </div>
        )}
      </div>
      <p className="mt-4 text-center font-display text-xl font-bold text-foreground sm:text-2xl">{token.name}</p>
      {answered !== undefined && (
        <p className="mt-1 text-center text-[0.7rem] italic" style={{ color: "var(--foreground-faint)" }}>
          {answered ? "Answered this year" : "Not answered yet"}
        </p>
      )}
    </Link>
  );
}

export function GalleryCarousel({
  tokens,
  answeredTokenIds,
  hasCurrentQuestion,
}: {
  tokens: OwnedToken[];
  answeredTokenIds: string[];
  hasCurrentQuestion: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const hasMultiple = tokens.length > 1;

  function go(delta: 1 | -1) {
    setDirection(delta);
    setIndex((prev) => (prev + delta + tokens.length) % tokens.length);
  }

  useEffect(() => {
    if (!hasMultiple) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultiple]);

  // Clamp defensively rather than trust `index` is always in range — e.g.
  // if the underlying token list were ever to shrink while this stayed
  // mounted, a stale index would otherwise render nothing at all.
  const safeIndex = Math.min(index, tokens.length - 1);
  const token = tokens[safeIndex];
  if (!token) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3 sm:gap-8">
        {hasMultiple && <ArrowButton direction="prev" onClick={() => go(-1)} />}

        <div className="min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={token.tokenId}
              custom={direction}
              initial={{ opacity: 0, x: 24 * direction }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 * direction }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <CarouselSlide
                token={token}
                answered={hasCurrentQuestion ? answeredTokenIds.includes(token.tokenId) : undefined}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {hasMultiple && <ArrowButton direction="next" onClick={() => go(1)} />}
      </div>

      {hasMultiple && (
        <p className="mt-6 text-center text-xs" style={{ color: "var(--foreground-faint)" }}>
          {safeIndex + 1} of {tokens.length}
        </p>
      )}
    </div>
  );
}
