import { NextResponse } from "next/server";
import { getGalleryConfig, getActiveQuestion } from "@/lib/config";
import { resolveAccessibleTokens } from "@/lib/access";
import { getWalletSession } from "@/lib/walletSession";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getWalletSession();
  const owner = session.walletAddress;
  if (!owner) {
    return NextResponse.json({ error: "Please connect and verify your wallet" }, { status: 401 });
  }

  const config = await getGalleryConfig();
  if (!config.nftContractAddress) {
    return NextResponse.json({ configured: false, tokens: [] });
  }

  try {
    const [resolved, currentQuestion] = await Promise.all([
      resolveAccessibleTokens(owner, config.nftContractAddress, config.chainId),
      getActiveQuestion(),
    ]);

    const tokens = resolved.map((entry) => entry.token);

    // For the "N of M pieces answered" summary — each piece's answer is
    // keyed on its own owner/vault address (see resolveAccessibleTokens),
    // not necessarily the connected wallet, so this can't be a single
    // walletAddress lookup.
    let answeredTokenIds: string[] = [];
    if (currentQuestion && resolved.length > 0) {
      const answers = await prisma.answer.findMany({
        where: {
          questionId: currentQuestion.id,
          OR: resolved.map(({ token, ownerAddress }) => ({ tokenId: token.tokenId, walletAddress: ownerAddress })),
        },
        select: { tokenId: true },
      });
      answeredTokenIds = answers.map((a) => a.tokenId);
    }

    return NextResponse.json({
      configured: true,
      tokens,
      currentQuestion: currentQuestion
        ? {
            yearNumber: currentQuestion.yearNumber,
            text: currentQuestion.text,
            startsAt: currentQuestion.startsAt,
            endsAt: currentQuestion.endsAt,
          }
        : null,
      answeredTokenIds,
    });
  } catch {
    return NextResponse.json({ error: "Failed to reach the NFT provider" }, { status: 502 });
  }
}
