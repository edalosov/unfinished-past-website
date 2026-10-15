"use client";

import { motion } from "framer-motion";

export function WelcomeScreen() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
        className="font-display text-4xl font-bold underline-thick tracking-tight text-foreground sm:text-5xl"
      >
        Welcome
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 text-sm font-light tracking-wide text-foreground-muted sm:text-base"
        style={{ color: "var(--foreground-muted)" }}
      >
        Please connect your wallet to continue
      </motion.p>
    </div>
  );
}
