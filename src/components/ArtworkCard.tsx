"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useFallbackImage } from "@/hooks/useFallbackImage";
import type { OwnedToken } from "@/lib/alchemy";

export function ArtworkCard({
  token,
  index,
  answered,
}: {
  token: OwnedToken;
  index: number;
  // Whether this piece has an answer for the current question — omitted
  // entirely (no indicator shown) when there's no open question to answer.
  // Purely informational either way: answering isn't assumed to be the
  // only, or the "right," way to spend time with a piece.
  answered?: boolean;
}) {
  const { src, failed, loaded, onLoad, onError } = useFallbackImage(token.images, token.tokenId);
  const reported = useRef(false);

  useEffect(() => {
    if (!failed || reported.current) return;
    reported.current = true;
    fetch(`/api/art/${token.tokenId}/refresh-image`, { method: "POST" }).catch(() => {});
  }, [failed, token.tokenId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.1 * index, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={`/art/${token.tokenId}`} className="group block">
        <div
          className="w-full overflow-hidden border"
          style={{ borderColor: "var(--border-soft)", background: "var(--background-elevated)" }}
        >
          {src ? (
            // motion.img, not next/image: these come from arbitrary
            // external hosts. Every piece in the collection is 16:9, so the
            // frame is fixed to that ratio rather than sized off whatever
            // the file reports. Fading via framer-motion's `animate` prop
            // (rather than a raw CSS transition tied to inline style state)
            // guarantees the transition actually plays even for a cached
            // image, where the load event can otherwise fire before the
            // hidden frame is ever painted.
            <motion.img
              src={src}
              alt={token.name}
              loading="lazy"
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
        <p
          className="mt-3 text-center text-sm font-light tracking-wide group-hover:underline"
          style={{ color: "var(--foreground-muted)" }}
        >
          {token.name}
        </p>
        {answered !== undefined && (
          <p className="mt-1 text-center text-xs" style={{ color: "var(--foreground-faint)" }}>
            {answered ? "Answered this year" : "Not answered yet"}
          </p>
        )}
      </Link>
    </motion.div>
  );
}
