import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { listQuestions } from "@/lib/config";
import { AdminQuestionsManager } from "@/components/AdminQuestionsManager";
import { FadeIn } from "@/components/FadeIn";

export default async function AdminQuestionsPage() {
  const session = await getSession();
  if (!session.isAdmin) {
    redirect("/admin/login");
  }

  const questions = await listQuestions();

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 sm:px-10 sm:py-32">
      <FadeIn>
        <Link href="/admin" className="text-xs underline" style={{ color: "var(--foreground-faint)" }}>
          ← Gallery settings
        </Link>
        <h1 className="mt-4 font-display text-3xl italic text-foreground">Questions schedule</h1>
        <AdminQuestionsManager
          initialQuestions={questions.map((q) => ({
            id: q.id,
            text: q.text,
            startsAt: q.startsAt.toISOString(),
            endsAt: q.endsAt.toISOString(),
            answerCount: q.answerCount,
          }))}
        />
      </FadeIn>
    </div>
  );
}
