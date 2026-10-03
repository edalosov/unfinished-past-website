import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getGalleryConfig } from "@/lib/config";
import { refreshContractMetadata } from "@/lib/alchemy";

// Bulk version of the per-piece self-heal that already runs when someone
// views a broken image — tells Alchemy to fully re-ingest the configured
// contract from origin, instead of waiting for individual holders to
// stumble onto a broken piece first. Meant to be run right after pointing
// the gallery at a new contract. Safe to call repeatedly; it just reports
// the reingestion job's current progress.
export async function POST() {
  try {
    const session = await getSession();
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getGalleryConfig();
    if (!config.nftContractAddress) {
      return NextResponse.json({ error: "Gallery not configured" }, { status: 400 });
    }

    const result = await refreshContractMetadata(config.nftContractAddress, config.chainId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach the NFT provider";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
