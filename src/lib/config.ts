import { prisma } from "@/lib/db";

const DEFAULT_CONFIG = {
  id: 1,
  nftContractAddress: null as string | null,
  chainId: 11155111,
  updatedAt: new Date(0),
};

export async function getGalleryConfig() {
  const config = await prisma.galleryConfig.findUnique({ where: { id: 1 } });
  return config ?? DEFAULT_CONFIG;
}

export async function setGalleryConfig(data: {
  nftContractAddress: string;
  chainId: number;
}) {
  return prisma.galleryConfig.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
}

// The question whose window contains right now — never toggled by hand,
// just whichever scheduled question is currently live. A question outside
// its window (not yet started, or past its end date) is simply never
// returned here, which is also what closes it for new answers and display
// everywhere else in the app.
export async function getActiveQuestion() {
  const now = new Date();
  const question = await prisma.question.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { startsAt: "desc" },
  });
  if (!question) return null;

  // "Year N" for display — the question's 1-based position in chronological
  // order (by startsAt), not the calendar year, so the first question ever
  // scheduled is Year 1, the next is Year 2, and so on.
  const yearNumber = await prisma.question.count({
    where: { startsAt: { lte: question.startsAt } },
  });

  return { ...question, yearNumber };
}

export async function listQuestions() {
  const questions = await prisma.question.findMany({
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { answers: true } } },
  });
  return questions.map(({ _count, ...question }) => ({ ...question, answerCount: _count.answers }));
}

// All scheduled questions in chronological order, each tagged with its
// "Year N" ordinal and whether its window is done, live, or hasn't opened
// yet — the data the collector-facing year-tab navigation is built from.
export async function listQuestionsWithStatus() {
  const questions = await prisma.question.findMany({ orderBy: { startsAt: "asc" } });
  const now = new Date();
  return questions.map((question, index) => ({
    ...question,
    yearNumber: index + 1,
    status: now < question.startsAt ? ("future" as const) : now >= question.endsAt ? ("past" as const) : ("current" as const),
  }));
}

export async function createQuestion(data: { text: string; startsAt: Date; endsAt: Date }) {
  if (data.endsAt <= data.startsAt) {
    throw new Error("End date must be after the start date");
  }

  // Keep "which question is current" unambiguous — reject any window that
  // overlaps an existing one.
  const overlapping = await prisma.question.findFirst({
    where: {
      startsAt: { lt: data.endsAt },
      endsAt: { gt: data.startsAt },
    },
  });
  if (overlapping) {
    throw new Error(`Overlaps with an existing question's window: "${overlapping.text}"`);
  }

  return prisma.question.create({ data });
}

// For a question that's already live: fixes a wording mistake or adjusts
// how long it stays open, without touching its id — any answers already
// submitted against it stay valid. The start date is left alone, since
// that's what makes this question "current" in the first place; changing
// it would just be a delete-and-recreate under a different name.
export async function updateQuestion(id: string, data: { text?: string; endsAt?: Date }) {
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) {
    throw new Error("Question not found");
  }
  if (question.startsAt > new Date()) {
    throw new Error("This question hasn't started yet — delete and recreate it instead");
  }
  if (question.endsAt <= new Date()) {
    throw new Error("Can't edit a question that has already ended");
  }

  const nextEndsAt = data.endsAt ?? question.endsAt;
  if (nextEndsAt <= question.startsAt) {
    throw new Error("End date must be after the start date");
  }

  const overlapping = await prisma.question.findFirst({
    where: {
      id: { not: id },
      startsAt: { lt: nextEndsAt },
      endsAt: { gt: question.startsAt },
    },
  });
  if (overlapping) {
    throw new Error(`Overlaps with an existing question's window: "${overlapping.text}"`);
  }

  return prisma.question.update({
    where: { id },
    data: { text: data.text ?? question.text, endsAt: nextEndsAt },
  });
}

export async function deleteQuestion(id: string) {
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) {
    throw new Error("Question not found");
  }
  // Once a question's window has closed, its answers are historical record
  // and shouldn't be touched. The currently live question can still be
  // deleted — the schema cascades that delete onto any answers already
  // submitted against it, so the UI is responsible for warning about that
  // before calling this.
  if (question.endsAt <= new Date()) {
    throw new Error("Can't delete a question that has already ended");
  }
  return prisma.question.delete({ where: { id } });
}
