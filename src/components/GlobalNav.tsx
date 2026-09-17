"use client";

import { usePathname } from "next/navigation";
import { ConnectButton } from "@/components/ConnectButton";

// Only shown on the main gallery page — hidden on the artwork detail view
// (whether the intercepted modal or the full-page route), where it used to
// collide with the modal's own close button.
export function GlobalNav() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <header className="fixed top-0 right-0 z-50 p-6 sm:p-8">
      <ConnectButton />
    </header>
  );
}
