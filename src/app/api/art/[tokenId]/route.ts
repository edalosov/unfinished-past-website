import { NextRequest, NextResponse } from "next/server";
import { getGalleryConfig, listQuestionsWithStatus } from "@/lib/config";
import { getTokenMetadata } from "@/lib/alchemy";
import { resolveTokenAccess } from "@/lib/access";
import { getWalletSession } from "@/lib/walletSession";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId } = await params;

  const session = await getWalletSession();
  const address = session.walletAddress;
  if (!address) {
    return NextResponse.json({ error: "Please connect and verify your wallet" }, { status: 401 });
  }

  const config = await getGalleryConfig();
  if (!config.nftContractAddress) {
    return NextResponse.json({ error: "Gallery not configured" }, { status: 404 });
  }

  try {
    const { allowed, ownerAddress } = await resolveTokenAccess(
      address,
      config.nftContractAddress,
      tokenId,
      config.chainId,
    );
    if (!allowed || !ownerAddress) {
      return NextResponse.json({ error: "You do not own this piece" }, { status: 403 });
    }

    const [token, questions, answers] = await Promise.all([
      getTokenMetadata(config.nftContractAddress, tokenId, config.chainId),
      listQuestionsWithStatus(),
      prisma.answer.findMany({ where: { walletAddress: ownerAddress, tokenId } }),
    ]);

    const answersByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]));

    // One entry per scheduled year, oldest first — the wallet's answer for
    // that year merged in if it submitted one, so the client can render
    // year-tab navigation without a second round trip.
    const years = questions.map((question) => {
      const answer = answersByQuestionId.get(question.id);
      return {
        yearNumber: question.yearNumber,
        questionId: question.id,
        questionText: question.text,
        startsAt: question.startsAt,
        endsAt: question.endsAt,
        status: question.status,
        answer: answer
          ? {
              id: answer.id,
              answerText: answer.answerText,
              sharePreference: answer.sharePreference,
              createdAt: answer.createdAt,
            }
          : null,
      };
    });

    return NextResponse.json({ token, years });
  } catch {
    return NextResponse.json({ error: "Failed to reach the NFT provider" }, { status: 502 });
  }
}
