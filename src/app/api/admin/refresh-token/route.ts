import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getGalleryConfig } from "@/lib/config";
import { refreshTokenMetadata } from "@/lib/alchemy";

// Manual trigger for the same per-token refresh the reactive self-heal
// uses — that one only fires on an actual image load failure, which
// doesn't help when a piece's metadata was updated (e.g. the artist
// swapped in a revised image) but the old one still loads fine, just
// stale. Lets an admin force Alchemy to re-resolve one token on demand.
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tokenId } = await request.json();
    if (!tokenId || typeof tokenId !== "string") {
      return NextResponse.json({ error: "tokenId is required" }, { status: 400 });
    }

    const config = await getGalleryConfig();
    if (!config.nftContractAddress) {
      return NextResponse.json({ error: "Gallery not configured" }, { status: 400 });
    }

    await refreshTokenMetadata(config.nftContractAddress, tokenId, config.chainId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach the NFT provider";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
