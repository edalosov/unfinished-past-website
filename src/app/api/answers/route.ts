import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAddress, type Hex } from "viem";
import { getGalleryConfig, getActiveQuestion } from "@/lib/config";
import { resolveTokenAccess } from "@/lib/access";
import { getTokenMetadata } from "@/lib/alchemy";
import { verifyAnswerSignature } from "@/lib/verifySignature";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

const ALREADY_ANSWERED_MESSAGE = "You've already submitted your answer for this year's question.";

const bodySchema = z.object({
  walletAddress: z.string().refine(isAddress),
  tokenId: z.string().min(1),
  answerText: z.string().min(1).max(300),
  sharePreference: z.enum(["PRIVATE", "ANONYMOUS", "NAMED"]),
  timestamp: z.number(),
  signature: z.string().startsWith("0x"),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { walletAddress, tokenId, answerText, sharePreference, timestamp, signature } = parsed.data;

  const question = await getActiveQuestion();
  if (!question) {
    return NextResponse.json({ error: "No active question set" }, { status: 400 });
  }

  const config = await getGalleryConfig();
  if (!config.nftContractAddress) {
    return NextResponse.json({ error: "Gallery not configured" }, { status: 400 });
  }

  let ownerAddress: string | null;
  let tokenName: string;
  try {
    const [access, token] = await Promise.all([
      resolveTokenAccess(walletAddress, config.nftContractAddress, tokenId, config.chainId),
      getTokenMetadata(config.nftContractAddress, tokenId, config.chainId),
    ]);
    if (!access.allowed || !access.ownerAddress) {
      return NextResponse.json({ error: "You do not own this piece" }, { status: 403 });
    }
    ownerAddress = access.ownerAddress;
    tokenName = token.name;
  } catch {
    return NextResponse.json({ error: "Failed to reach the NFT provider" }, { status: 502 });
  }

  // Signature verification is always against the connecting wallet — that's
  // whoever actually holds the signing key, whether that's the owner or a
  // delegate.xyz-delegated hot wallet.
  const signatureValid = await verifyAnswerSignature({
    tokenId,
    questionText: question.text,
    answerText,
    sharePreference,
    timestamp,
    signature: signature as Hex,
    claimedAddress: walletAddress,
  });
  if (!signatureValid) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  const signer = walletAddress.toLowerCase();
  const signerAddress = signer === ownerAddress ? null : signer;

  // One answer per (wallet, token, question) — checked up front for a
  // clean error message, with the DB's unique constraint as a backstop
  // against a race between two near-simultaneous submissions.
  const existing = await prisma.answer.findUnique({
    where: { walletAddress_tokenId_questionId: { walletAddress: ownerAddress, tokenId, questionId: question.id } },
  });
  if (existing) {
    return NextResponse.json({ error: ALREADY_ANSWERED_MESSAGE }, { status: 409 });
  }

  try {
    const answer = await prisma.answer.create({
      data: {
        walletAddress: ownerAddress,
        signerAddress,
        tokenId,
        tokenName,
        questionId: question.id,
        answerText,
        sharePreference,
        signature,
      },
      include: { question: true },
    });

    return NextResponse.json({ answer });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: ALREADY_ANSWERED_MESSAGE }, { status: 409 });
    }
    throw err;
  }
}
