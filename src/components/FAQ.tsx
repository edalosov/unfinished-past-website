"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const INTRO_PARAGRAPHS = [
  "Unfinished Past is a series of participatory time-based AI-generated artworks inspired by memories from strangers online, friends and family, and myself.",
  "Each one begins as a recognizable moment of a lived experience, and for the next seven years, will transform over time according to a single variable: whether its owner chooses to engage with it or not.",
  "Once a year, a short question about the piece surfaces (to be answered on-chain). Owners can respond (to \"remember\"), or they can choose to do nothing (to \"forget\"). That decision, repeated or avoided year after year, determines how it changes.",
  "The final piece becomes a record of a seven-year relationship between a collector and their work of art.",
];

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "What do you mean by \"remembering\" or \"forgetting\"?",
    answer:
      "To \"remember\" is to answer the yearly question attached individually to your piece. To \"forget\" is to ignore the yearly question attached individually to your piece.",
  },
  {
    question:
      "So that means that if I hold multiple pieces, I can theoretically remember some of them and forget some of them?",
    answer: "That is correct.",
  },
  {
    question: "Do I have to answer the yearly question if I want my piece to remain the same?",
    answer:
      "Yes, but I just want you to know that even if you answer the question and \"remember\" all 7 years, your piece will slightly change. Minimal details here and there will be different, just like our memories do.",
  },
  {
    question: "What happens if I forget one year and then remember?",
    answer:
      "Once you forget a year you won't be able to reverse the forgetting process. However, for every year that you decide to answer the question afterwards, you will be able to slow down the forgetting process.",
  },
  {
    question: "What happens if I remember and then forget?",
    answer:
      "Your piece will remain (mostly) unchanged as long as you remember, and then the year you forget it will start the forgetting process.",
  },
  {
    question: "What's the forgetting process?",
    answer:
      "It's the process that starts on your piece the day a yearly question is due and you don't answer it. Your piece will slowly transform into a blurred and noisy memory of what it once was.",
  },
  {
    question: "How many times can I answer?",
    answer: "You can only answer the question once per year, so make it count!",
  },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-t" style={{ borderColor: "var(--border-soft)" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-6 py-6 text-left"
      >
        <span className="font-display-italic-alt text-base italic text-foreground sm:text-lg">{question}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 transition-transform duration-300"
          style={{ color: "var(--foreground-muted)", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M3 6L8 11L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-sm font-light leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQPopup({ onClose }: { onClose: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 14 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="no-scrollbar relative z-10 max-h-[85dvh] w-full max-w-2xl overflow-y-auto border"
        style={{ borderColor: "var(--border-soft)", background: "var(--background)" }}
      >
        <div className="px-6 py-10 sm:px-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>
                FAQ
              </p>
              <h2 className="mt-3 font-display-italic-alt text-2xl italic leading-snug text-foreground sm:text-3xl">
                Remind me how this all works, please.
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 text-2xl leading-none transition-colors hover:text-[var(--foreground)]"
              style={{ color: "var(--foreground-muted)" }}
            >
              ×
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {INTRO_PARAGRAPHS.map((paragraph, i) => (
              <p key={i} className="text-sm font-light leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-10">
            {FAQ_ITEMS.map((item, i) => (
              <FAQItem
                key={item.question}
                question={item.question}
                answer={item.answer}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex((prev) => (prev === i ? null : i))}
              />
            ))}
            <div className="border-t" style={{ borderColor: "var(--border-soft)" }} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function FAQ() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="gallery-connect-btn w-full">
        FAQ
      </button>
      <AnimatePresence>{isOpen && <FAQPopup onClose={() => setIsOpen(false)} />}</AnimatePresence>
    </>
  );
}
