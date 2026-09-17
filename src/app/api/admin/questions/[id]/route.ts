import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { deleteQuestion, updateQuestion } from "@/lib/config";

const patchSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  endsAt: z.string().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  let endsAt: Date | undefined;
  if (parsed.data.endsAt !== undefined) {
    endsAt = new Date(parsed.data.endsAt);
    if (Number.isNaN(endsAt.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
  }

  try {
    const question = await updateQuestion(id, { text: parsed.data.text, endsAt });
    return NextResponse.json({ question });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update question" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteQuestion(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete question" }, { status: 400 });
  }
}
