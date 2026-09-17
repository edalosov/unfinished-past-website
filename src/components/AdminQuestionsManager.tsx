"use client";

import { useState } from "react";

type QuestionRow = {
  id: string;
  text: string;
  startsAt: string;
  endsAt: string;
  answerCount: number;
};

function questionStatus(q: QuestionRow): "Past" | "Current" | "Upcoming" {
  const now = Date.now();
  const starts = new Date(q.startsAt).getTime();
  const ends = new Date(q.endsAt).getTime();
  if (now < starts) return "Upcoming";
  if (now >= ends) return "Past";
  return "Current";
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

export function AdminQuestionsManager({ initialQuestions }: { initialQuestions: QuestionRow[] }) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [text, setText] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");

  async function handleCreate() {
    setBusy(true);
    setStatusMessage(null);

    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      }),
    });

    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatusMessage(data.error || "Failed to create question");
      return;
    }

    const data = await res.json();
    setQuestions((prev) =>
      [{ ...data.question, answerCount: 0 }, ...prev].sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1)),
    );
    setText("");
    setStartsAt("");
    setEndsAt("");
    setStatusMessage("Question scheduled.");
  }

  function startEdit(q: QuestionRow) {
    setStatusMessage(null);
    setEditingId(q.id);
    setEditText(q.text);
    setEditEndsAt(toDateInputValue(q.endsAt));
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleReplace(id: string) {
    setBusy(true);
    setStatusMessage(null);

    const res = await fetch(`/api/admin/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: editText,
        endsAt: new Date(editEndsAt).toISOString(),
      }),
    });

    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatusMessage(data.error || "Failed to update question");
      return;
    }

    const data = await res.json();
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...data.question, answerCount: q.answerCount } : q)));
    setEditingId(null);
    setStatusMessage("Question updated.");
  }

  async function handleDelete(q: QuestionRow, requireConfirmation: boolean) {
    if (requireConfirmation) {
      const warning =
        q.answerCount > 0
          ? `Delete this question? ${q.answerCount} answer${q.answerCount === 1 ? "" : "s"} already submitted for it will be permanently deleted too. This can't be undone.`
          : "Delete this question? This can't be undone.";
      if (!window.confirm(warning)) return;
    }

    const id = q.id;
    setBusy(true);
    setStatusMessage(null);

    const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatusMessage(data.error || "Failed to delete question");
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  return (
    <div className="mt-10 flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>
          Schedule a new question
        </h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="What does this piece mean to you today?"
          className="resize-none rounded-md border bg-transparent px-4 py-3 text-sm text-foreground outline-none focus:border-[var(--accent)]"
          style={{ borderColor: "var(--border-soft)" }}
        />
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--foreground-muted)" }}>
            Starts
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="rounded-md border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--accent)]"
              style={{ borderColor: "var(--border-soft)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--foreground-muted)" }}>
            Ends
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="rounded-md border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--accent)]"
              style={{ borderColor: "var(--border-soft)" }}
            />
          </label>
        </div>
        <p className="text-xs" style={{ color: "var(--foreground-faint)" }}>
          Pick whatever start and end dates you want — windows just can&apos;t overlap an existing question.
        </p>
        <button
          type="button"
          onClick={handleCreate}
          disabled={busy || !text.trim() || !startsAt || !endsAt}
          className="gallery-connect-btn self-start disabled:opacity-40"
        >
          Schedule question
        </button>
        {statusMessage && (
          <p className="text-sm" style={{ color: "var(--accent)" }}>
            {statusMessage}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>
          All questions
        </h2>
        {questions.length === 0 ? (
          <p className="text-sm font-light" style={{ color: "var(--foreground-faint)" }}>
            No questions scheduled yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {questions.map((q) => {
              const s = questionStatus(q);
              return (
                <li key={q.id} className="rounded-md border p-4" style={{ borderColor: "var(--border-soft)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="text-xs uppercase tracking-widest"
                      style={{ color: s === "Current" ? "var(--accent)" : "var(--foreground-faint)" }}
                    >
                      {s}
                    </span>
                    {s === "Upcoming" && (
                      <button
                        type="button"
                        onClick={() => handleDelete(q, false)}
                        disabled={busy}
                        className="text-xs underline disabled:opacity-40"
                        style={{ color: "#d99c82" }}
                      >
                        Delete
                      </button>
                    )}
                    {s === "Current" && editingId !== q.id && (
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => startEdit(q)}
                          disabled={busy}
                          className="text-xs underline disabled:opacity-40"
                          style={{ color: "var(--foreground-muted)" }}
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(q, true)}
                          disabled={busy}
                          className="text-xs underline disabled:opacity-40"
                          style={{ color: "#d99c82" }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {editingId === q.id ? (
                    <div className="mt-3 flex flex-col gap-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        maxLength={500}
                        className="resize-none rounded-md border bg-transparent px-4 py-3 text-sm text-foreground outline-none focus:border-[var(--accent)]"
                        style={{ borderColor: "var(--border-soft)" }}
                      />
                      <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--foreground-muted)" }}>
                        Ends
                        <input
                          type="date"
                          value={editEndsAt}
                          onChange={(e) => setEditEndsAt(e.target.value)}
                          className="w-fit rounded-md border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--accent)]"
                          style={{ borderColor: "var(--border-soft)" }}
                        />
                      </label>
                      <p className="text-xs" style={{ color: "var(--foreground-faint)" }}>
                        Started {toDateInputValue(q.startsAt)} — the start date can&apos;t change once a question
                        has gone live.
                      </p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleReplace(q.id)}
                          disabled={busy || !editText.trim() || !editEndsAt}
                          className="gallery-connect-btn self-start disabled:opacity-40"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={busy}
                          className="text-xs underline disabled:opacity-40"
                          style={{ color: "var(--foreground-faint)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-2 text-sm font-light leading-relaxed text-foreground">{q.text}</p>
                      <p className="mt-2 text-xs" style={{ color: "var(--foreground-faint)" }}>
                        {toDateInputValue(q.startsAt)} → {toDateInputValue(q.endsAt)}
                      </p>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
