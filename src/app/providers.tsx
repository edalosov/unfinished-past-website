"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";

import "@rainbow-me/rainbowkit/styles.css";

// Matches the site's single cinematic theme (globals.css) — a deep
// blue-teal night palette with a warm amber accent.
const rainbowKitTheme = darkTheme({
  accentColor: "#c98a4b",
  accentColorForeground: "#10181c",
  borderRadius: "medium",
  fontStack: "system",
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowKitTheme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
