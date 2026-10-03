import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getGalleryConfig } from "@/lib/config";
import { refreshAllTokenMetadata } from "@/lib/alchemy";

// Bulk version of the per-piece self-heal that already runs when someone
// views a broken image — walks every token in the configured contract and
// asks Alchemy to re-cache it, instead of waiting for individual holders
// to stumble onto a broken piece first. Meant to be run right after
// pointing the gallery at a new contract.
export async function POST() {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getGalleryConfig();
  if (!config.nftContractAddress) {
    return NextResponse.json({ error: "Gallery not configured" }, { status: 400 });
  }

  try {
    const result = await refreshAllTokenMetadata(config.nftContractAddress, config.chainId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to reach the NFT provider" }, { status: 502 });
  }
}
