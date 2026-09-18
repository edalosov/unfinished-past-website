"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArtworkCard } from "@/components/ArtworkCard";
import { GalleryCarousel } from "@/components/GalleryCarousel";
import { GalleryStatusPanel, type CurrentQuestion } from "@/components/GalleryStatusPanel";
import type { OwnedToken } from "@/lib/alchemy";

type ViewMode = "grid" | "gallery";

type GalleryData = {
  tokens: OwnedToken[];
  currentQuestion: CurrentQuestion | null;
  answeredTokenIds: string[];
};

type GalleryState =
  | { status: "loading" }
  | { status: "not-configured" }
  | { status: "ready"; data: GalleryData }
  | { status: "error"; message: string };

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] as const },
};

export function ArtworkGrid() {
  const [state, setState] = useState<GalleryState>({ status: "loading" });
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/gallery")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load gallery");
        return res.json() as Promise<{ configured: boolean } & Partial<GalleryData>>;
      })
      .then((data) => {
        if (cancelled) return;
        if (!data.configured) {
          setState({ status: "not-configured" });
        } else {
          setState({
            status: "ready",
            data: {
              tokens: data.tokens ?? [],
              currentQuestion: data.currentQuestion ?? null,
              answeredTokenIds: data.answeredTokenIds ?? [],
            },
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-screen-2xl px-6 pb-24 pt-24 sm:px-10 sm:pt-28">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="font-display-italic-alt italic text-3xl text-foreground sm:text-4xl"
      >
        Unfinished Past
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="mt-2 text-base tracking-wide text-foreground sm:text-lg"
      >
        Click individually to answer
      </motion.p>

      {state.status === "ready" && state.data.tokens.length > 0 && (
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 flex gap-4"
        >
          {(["grid", "gallery"] as const).map((mode) => {
            const isSelected = viewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                aria-current={isSelected}
                className="text-sm capitalize underline-offset-4"
                style={{
                  color: isSelected ? "var(--foreground)" : "var(--foreground-muted)",
                  textDecoration: isSelected ? "underline" : "none",
                  fontWeight: isSelected ? 700 : 400,
                }}
              >
                {mode}
              </button>
            );
          })}
        </motion.nav>
      )}

      {state.status === "loading" && (
        <motion.p {...fadeIn} className="mt-10 text-sm font-light" style={{ color: "var(--foreground-faint)" }}>
          Gathering your pieces…
        </motion.p>
      )}

      {state.status === "not-configured" && (
        <motion.p {...fadeIn} className="mt-10 text-sm font-light" style={{ color: "var(--foreground-faint)" }}>
          The gallery hasn&apos;t been configured with a collection yet. Check back soon.
        </motion.p>
      )}

      {state.status === "error" && (
        <motion.p {...fadeIn} className="mt-10 text-sm font-light" style={{ color: "var(--foreground-faint)" }}>
          Something went wrong loading your collection. Please try again shortly.
        </motion.p>
      )}

      {state.status === "ready" && (
        <div className="mt-12 flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
          <div className="order-1 lg:order-2">
            <GalleryStatusPanel currentQuestion={state.data.currentQuestion} />
          </div>

          <div className="order-2 flex-1 lg:order-1">
            {state.data.tokens.length === 0 ? (
              <motion.p {...fadeIn} className="text-sm font-light" style={{ color: "var(--foreground-faint)" }}>
                This wallet doesn&apos;t hold any pieces from the collection yet.
              </motion.p>
            ) : viewMode === "gallery" ? (
              <GalleryCarousel
                tokens={state.data.tokens}
                answeredTokenIds={state.data.answeredTokenIds}
                hasCurrentQuestion={state.data.currentQuestion !== null}
              />
            ) : (
              <div className="grid grid-cols-2 gap-x-10 gap-y-16">
                {state.data.tokens.map((token, i) => (
                  <ArtworkCard
                    key={token.tokenId}
                    token={token}
                    index={i}
                    answered={
                      state.data.currentQuestion
                        ? state.data.answeredTokenIds.includes(token.tokenId)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
