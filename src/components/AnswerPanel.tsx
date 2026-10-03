"use client";

import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { buildAnswerMessage } from "@/lib/answerMessage";
import { isUserRejection } from "@/lib/walletErrors";

const MAX_LENGTH = 300;

export type SharePreference = "PRIVATE" | "ANONYMOUS" | "NAMED";

const SHARE_OPTIONS: { value: SharePreference; label: string }[] = [
  { value: "PRIVATE", label: "Please do not share my answer or my name." },
  { value: "ANONYMOUS", label: "You can share my answer, but please do so anonymously." },
  { value: "NAMED", label: "You can share my answer and my name, no problem with that." },
];

const SHARE_LABELS: Record<SharePreference, string> = {
  PRIVATE: "Not shared",
  ANONYMOUS: "Shared anonymously",
  NAMED: "Shared with your name",
};

export type YearEntry = {
  yearNumber: number;
  questionId: string;
  questionText: string;
  startsAt: string;
  endsAt: string;
  status: "past" | "current" | "future";
  answer: { id: string; answerText: string; sharePreference: SharePreference; createdAt: string } | null;
};

function defaultYear(years: YearEntry[]): number {
  const current = years.find((y) => y.status === "current");
  if (current) return current.yearNumber;
  const past = years.filter((y) => y.status === "past");
  if (past.length > 0) return past[past.length - 1].yearNumber;
  return years[0]?.yearNumber ?? 1;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function AnswerPanel({ tokenId, years }: { tokenId: string; years: YearEntry[] }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [localYears, setLocalYears] = useState(years);
  const [selectedYear, setSelectedYear] = useState(() => defaultYear(years));
  const [answerText, setAnswerText] = useState("");
  const [sharePreference, setSharePreference] = useState<SharePreference>("PRIVATE");
  const [status, setStatus] = useState<"idle" | "signing" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const current = localYears.find((y) => y.yearNumber === selectedYear) ?? null;
  const nextYear = current
    ? localYears.find((y) => y.yearNumber === current.yearNumber + 1)
    : undefined;
  // Future years are already scheduled in the admin, but showing their
  // number before the question actually opens reads as a broken/missing
  // question rather than "not yet" — so the tab stays hidden entirely
  // until that year's question goes live.
  const visibleYears = localYears.filter((y) => y.status !== "future");

  function selectYear(year: YearEntry) {
    if (year.status === "future") return;
    setSelectedYear(year.yearNumber);
    setAnswerText("");
    setSharePreference("PRIVATE");
    setError(null);
    setStatus("idle");
  }

  async function handleSubmit() {
    if (!address || !current || current.status !== "current" || current.answer) return;
    const questionText = current.questionText;
    setError(null);

    try {
      setStatus("signing");
      // handleSubmit only ever runs from the Submit button's onClick, never
      // during render — Date.now() here is a real submission timestamp, not
      // a render-time impurity.
      // eslint-disable-next-line react-hooks/purity
      const timestamp = Date.now();
      const message = buildAnswerMessage({ tokenId, questionText, answerText, sharePreference, timestamp });
      const signature = await signMessageAsync({ message });

      setStatus("submitting");
      const res = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          tokenId,
          answerText,
          sharePreference,
          timestamp,
          signature,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }

      const data = await res.json();
      setLocalYears((prev) =>
        prev.map((y) =>
          y.yearNumber === selectedYear
            ? {
                ...y,
                answer: {
                  id: data.answer.id,
                  answerText: data.answer.answerText,
                  sharePreference: data.answer.sharePreference,
                  createdAt: data.answer.createdAt,
                },
              }
            : y,
        ),
      );
      setAnswerText("");
      setSharePreference("PRIVATE");
      setStatus("idle");
    } catch (err) {
      setError(
        isUserRejection(err)
          ? "Request rejected. Please submit again."
          : err instanceof Error
            ? err.message
            : "Something went wrong",
      );
      setStatus("error");
    }
  }

  return (
    <div className="flex h-full flex-col gap-8 px-6 py-10 sm:px-10">
      {localYears.length === 0 ? (
        <p className="text-sm font-light" style={{ color: "var(--foreground-faint)" }}>
          No question has been set yet.
        </p>
      ) : (
        <>
          {visibleYears.length > 1 && (
            <nav className="flex flex-wrap gap-3">
              {visibleYears.map((year) => {
                const isSelected = year.yearNumber === selectedYear;
                return (
                  <button
                    key={year.yearNumber}
                    type="button"
                    onClick={() => selectYear(year)}
                    aria-current={isSelected}
                    className="text-sm underline-offset-4"
                    style={{
                      color: isSelected ? "var(--foreground)" : "var(--foreground-muted)",
                      textDecoration: isSelected ? "underline" : "none",
                      fontWeight: isSelected ? 700 : 400,
                    }}
                  >
                    {year.yearNumber}
                  </button>
                );
              })}
            </nav>
          )}

          {current && (
            <section>
              <h2 className="text-xs uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>
                Year {current.yearNumber}
              </h2>

              <p className="mt-4 font-display-italic-alt text-lg italic leading-relaxed text-foreground">
                {current.questionText}
              </p>

              {current.answer ? (
                <>
                  <p className="mt-6 text-sm font-light leading-relaxed text-foreground">
                    {current.answer.answerText}
                  </p>
                  <p className="mt-2 text-xs" style={{ color: "var(--foreground-faint)" }}>
                    Submitted {new Date(current.answer.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--foreground-faint)" }}>
                    Sharing preference: {SHARE_LABELS[current.answer.sharePreference]}
                  </p>
                  <hr className="mt-6 border-t" style={{ borderColor: "var(--border-soft)" }} />
                  <p className="mt-6 text-xs" style={{ color: "var(--foreground-muted)" }}>
                    You&apos;ve already submitted your answer for this year&apos;s question. Thank you for that!
                  </p>
                  <p className="mt-2 text-xs" style={{ color: "var(--foreground-faint)" }}>
                    {nextYear
                      ? `Next year's question opens ${formatDate(nextYear.startsAt)}.`
                      : "The next year's question hasn't been scheduled yet."}
                  </p>
                </>
              ) : current.status === "current" ? (
                <>
                  <p className="mt-2 text-xs" style={{ color: "var(--foreground-faint)" }}>
                    Answer by {formatDate(current.endsAt)}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--foreground-faint)" }}>
                    You may only answer once per year. Make it count!
                  </p>

                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value.slice(0, MAX_LENGTH))}
                    maxLength={MAX_LENGTH}
                    rows={5}
                    placeholder="Write your answer…"
                    className="mt-6 w-full resize-none rounded-md border bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground outline-none focus:border-[var(--accent)]"
                    style={{ borderColor: "var(--border-soft)" }}
                  />

                  <fieldset className="mt-6">
                    <legend className="text-xs uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>
                      Select one of the following
                    </legend>
                    <div className="mt-3 flex flex-col gap-2">
                      {SHARE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-start gap-2 text-sm leading-relaxed text-foreground"
                        >
                          <input
                            type="radio"
                            name="sharePreference"
                            value={option.value}
                            checked={sharePreference === option.value}
                            onChange={() => setSharePreference(option.value)}
                            className="mt-1 shrink-0"
                            style={{ accentColor: "var(--accent)" }}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--foreground-faint)" }}>
                      {answerText.length}/{MAX_LENGTH}
                    </span>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!answerText.trim() || status === "signing" || status === "submitting"}
                      className="gallery-connect-btn disabled:opacity-40"
                    >
                      {status === "signing"
                        ? "Confirm in wallet…"
                        : status === "submitting"
                          ? "Submitting…"
                          : "Submit"}
                    </button>
                  </div>
                  {error && (
                    <p className="mt-2 text-xs" style={{ color: "#d99c82" }}>
                      {error}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-6 text-sm font-light" style={{ color: "var(--foreground-faint)" }}>
                  No answer was submitted for this year.
                </p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
