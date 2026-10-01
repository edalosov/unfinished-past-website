import { recoverMessageAddress, type Hex } from "viem";
import { buildAnswerMessage } from "@/lib/answerMessage";

export async function verifyAnswerSignature(params: {
  tokenId: string;
  questionText: string;
  answerText: string;
  sharePreference: string;
  timestamp: number;
  signature: Hex;
  claimedAddress: string;
}) {
  const message = buildAnswerMessage(params);
  try {
    const recovered = await recoverMessageAddress({ message, signature: params.signature });
    return recovered.toLowerCase() === params.claimedAddress.toLowerCase();
  } catch {
    return false;
  }
}
