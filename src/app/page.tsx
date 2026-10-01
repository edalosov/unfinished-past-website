"use client";

import { useAccount } from "wagmi";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { VerifyWalletPrompt } from "@/components/VerifyWalletPrompt";
import { FAQSection } from "@/components/FAQSection";
import { useWalletVerification } from "@/hooks/useWalletVerification";

export default function Home() {
  const { isConnected } = useAccount();
  const { status, error, verify } = useWalletVerification();

  return (
    <>
      {!isConnected ? (
        <WelcomeScreen />
      ) : status !== "verified" ? (
        <VerifyWalletPrompt status={status} error={error} onVerify={verify} />
      ) : (
        <ArtworkGrid />
      )}
      <FAQSection />
    </>
  );
}
