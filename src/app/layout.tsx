import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, PT_Serif } from "next/font/google";
import { Providers } from "./providers";
import { GlobalNav } from "@/components/GlobalNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const displayItalicAlt = PT_Serif({
  variable: "--font-display-italic-alt",
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: "Unfinished Past",
  description: "A private gallery for holders.",
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${displayItalicAlt.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <GlobalNav />
          <main className="flex-1">{children}</main>
          {modal}
        </Providers>
      </body>
    </html>
  );
}
