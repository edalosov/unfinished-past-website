import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getGalleryConfig } from "@/lib/config";
import { getRawTokenMetadata } from "@/lib/alchemy";

// Returns everything Alchemy knows about one token's image, including the
// raw unprocessed metadata JSON — for figuring out which field (if any)
// actually holds the real full-resolution source when the usual
// candidates are coming back wrong for a given piece.
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

    const result = await getRawTokenMetadata(config.nftContractAddress, tokenId, config.chainId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach the NFT provider";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
