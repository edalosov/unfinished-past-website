"use client";

import { useState } from "react";
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

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-3xl px-6 pb-32 pt-24 sm:px-10 sm:pb-40 sm:pt-32"
    >
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>
        FAQ
      </p>
      <h2 className="mt-3 font-display-italic-alt text-2xl italic leading-snug text-foreground sm:text-3xl">
        Remind me how this all works, please.
      </h2>

      <div className="mt-6 flex flex-col gap-4">
        {INTRO_PARAGRAPHS.map((paragraph, i) => (
          <p key={i} className="text-sm font-light leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-12">
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
    </motion.section>
  );
}
