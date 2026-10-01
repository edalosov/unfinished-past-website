import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import type { SharePreference } from "@/generated/prisma/enums";

const SHARE_LABELS: Record<SharePreference, string> = {
  PRIVATE: "Do not share",
  ANONYMOUS: "Share anonymously",
  NAMED: "Share with name",
};

export async function GET() {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const answers = await prisma.answer.findMany({
    include: { question: true },
    orderBy: { createdAt: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Answers");
  sheet.columns = [
    { header: "Wallet address", key: "wallet", width: 44 },
    { header: "Artwork", key: "tokenName", width: 30 },
    { header: "Token ID", key: "tokenId", width: 12 },
    { header: "Question", key: "question", width: 50 },
    { header: "Answer", key: "answer", width: 60 },
    { header: "Share preference", key: "sharePreference", width: 22 },
    { header: "Signed by (if delegate)", key: "signer", width: 44 },
    { header: "Submitted at", key: "submittedAt", width: 24 },
  ];

  for (const answer of answers) {
    sheet.addRow({
      wallet: answer.walletAddress,
      tokenName: answer.tokenName,
      tokenId: answer.tokenId,
      question: answer.question.text,
      answer: answer.answerText,
      sharePreference: SHARE_LABELS[answer.sharePreference],
      signer: answer.signerAddress ?? "",
      submittedAt: answer.createdAt.toISOString(),
    });
  }
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `answers-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
