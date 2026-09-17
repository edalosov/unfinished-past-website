"use client";

import { motion } from "framer-motion";

export type CurrentQuestion = {
  yearNumber: number;
  text: string;
  startsAt: string;
  endsAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function daysRemaining(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function StatLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>
      {children}
    </p>
  );
}

export function GalleryStatusPanel({
  currentQuestion,
  answeredCount,
  totalCount,
}: {
  currentQuestion: CurrentQuestion | null;
  answeredCount: number;
  totalCount: number;
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="w-full lg:sticky lg:top-32 lg:w-72 xl:w-80"
    >
      <div
        className="flex flex-col gap-6 border p-6 sm:p-8"
        style={{ borderColor: "var(--border-soft)", background: "var(--background-elevated)" }}
      >
        {currentQuestion ? (
          <>
            <div>
              <StatLabel>Current year</StatLabel>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">Year {currentQuestion.yearNumber}</p>
            </div>

            <div>
              <StatLabel>This year&apos;s question</StatLabel>
              <p className="mt-2 font-display-italic-alt text-base italic leading-relaxed text-foreground">
                {currentQuestion.text}
              </p>
            </div>

            <hr className="border-t" style={{ borderColor: "var(--border-soft)" }} />

            <div>
              <StatLabel>Answer by</StatLabel>
              <p className="mt-2 text-sm text-foreground">{formatDate(currentQuestion.endsAt)}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--foreground-faint)" }}>
                {daysRemaining(currentQuestion.endsAt) === 0
                  ? "Closes today"
                  : `${daysRemaining(currentQuestion.endsAt)} day${daysRemaining(currentQuestion.endsAt) === 1 ? "" : "s"} left`}
              </p>
            </div>

            {totalCount > 0 && (
              <div>
                <StatLabel>Your progress</StatLabel>
                <p className="mt-2 text-sm text-foreground">
                  {answeredCount} of {totalCount} piece{totalCount === 1 ? "" : "s"} answered
                </p>
                <div className="mt-3 h-1 w-full overflow-hidden" style={{ background: "var(--border-soft)" }}>
                  <motion.div
                    className="h-full"
                    style={{ background: "var(--accent)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${totalCount === 0 ? 0 : (answeredCount / totalCount) * 100}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <StatLabel>Current year</StatLabel>
            <p className="mt-2 text-sm font-light" style={{ color: "var(--foreground-faint)" }}>
              No question is open right now. Check back soon.
            </p>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
