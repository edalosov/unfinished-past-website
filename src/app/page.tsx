"use client";

import { useAccount } from "wagmi";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { VerifyWalletPrompt } from "@/components/VerifyWalletPrompt";
import { useWalletVerification } from "@/hooks/useWalletVerification";

export default function Home() {
  const { isConnected } = useAccount();
  const { status, error, verify } = useWalletVerification();

  if (!isConnected) {
    return <WelcomeScreen />;
  }

  if (status !== "verified") {
    return <VerifyWalletPrompt status={status} error={error} onVerify={verify} />;
  }

  return <ArtworkGrid />;
}
