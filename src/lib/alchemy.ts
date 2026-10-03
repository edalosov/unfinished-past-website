import { Alchemy, Network } from "alchemy-sdk";

const networkForChainId: Record<number, Network> = {
  1: Network.ETH_MAINNET,
  11155111: Network.ETH_SEPOLIA,
};

function alchemyForChain(chainId: number) {
  const network = networkForChainId[chainId];
  if (!network) throw new Error(`Unsupported chainId: ${chainId}`);
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new Error("ALCHEMY_API_KEY is not set");
  return new Alchemy({ apiKey, network });
}

function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${url.slice("ipfs://".length)}`;
  }
  return url;
}

// The original source file is what was actually uploaded for the piece —
// Alchemy's cachedUrl is its own resized/recompressed copy, optimized for
// small marketplace thumbnails (often center-cropped to a square besides),
// which is a bad look blown up into the large single-piece views. Preferring
// real sources for quality is safe because useFallbackImage already
// cascades to the next candidate on a load failure, so this doesn't trade
// away the reliability cachedUrl was originally chosen for — it's just
// tried last now, as the true last resort. raw.metadata.image is the
// literal, unprocessed value from the token's own metadata; Alchemy's
// `originalUrl` is normally the same thing after their own normalization,
// but can be null when a token's metadata hasn't fully finished indexing
// yet even though the raw fetch already succeeded, so it's kept as a
// second-best real source rather than skipped straight to cachedUrl.
function candidateImages(nft: {
  image?: { cachedUrl?: string; originalUrl?: string };
  raw?: { metadata?: { image?: string } };
}): string[] {
  const candidates = [nft.image?.originalUrl, nft.raw?.metadata?.image, nft.image?.cachedUrl]
    .map(normalizeImageUrl)
    .filter((url): url is string => url !== null);
  return [...new Set(candidates)];
}

export type OwnedToken = {
  tokenId: string;
  name: string;
  images: string[];
};

export async function getOwnedTokens(
  ownerAddress: string,
  contractAddress: string,
  chainId: number,
): Promise<OwnedToken[]> {
  const alchemy = alchemyForChain(chainId);
  const response = await alchemy.nft.getNftsForOwner(ownerAddress, {
    contractAddresses: [contractAddress],
  });

  return response.ownedNfts.map((nft) => ({
    tokenId: nft.tokenId,
    name: nft.name || nft.raw?.metadata?.name || `#${nft.tokenId}`,
    images: candidateImages(nft),
  }));
}

export async function resolveTokenOwner(
  contractAddress: string,
  tokenId: string,
  chainId: number,
): Promise<string | null> {
  const alchemy = alchemyForChain(chainId);
  const owners = await alchemy.nft.getOwnersForNft(contractAddress, tokenId);
  return owners.owners[0]?.toLowerCase() ?? null;
}

export async function getTokenMetadata(
  contractAddress: string,
  tokenId: string,
  chainId: number,
): Promise<OwnedToken> {
  const alchemy = alchemyForChain(chainId);
  const nft = await alchemy.nft.getNftMetadata(contractAddress, tokenId);
  return {
    tokenId,
    name: nft.name || nft.raw?.metadata?.name || `#${tokenId}`,
    images: candidateImages(nft),
  };
}

// Asks Alchemy to re-fetch and re-cache this token's metadata/image from
// the origin. Alchemy enforces its own global 15-minutes-per-token
// cooldown, so it's safe to call this every time a load failure is
// detected without adding our own rate limiting on top.
export async function refreshTokenMetadata(
  contractAddress: string,
  tokenId: string,
  chainId: number,
): Promise<boolean> {
  const alchemy = alchemyForChain(chainId);
  return alchemy.nft.refreshNftMetadata(contractAddress, tokenId);
}

// Asks Alchemy to fully re-ingest the whole contract from origin — a
// single async job on Alchemy's side that re-crawls every token's
// metadata, rather than looping per-token refreshes (refreshNftMetadata
// only reports a change when its *cached timestamp* moves, which is a
// poor signal for "did this actually get fixed," and doesn't force a deep
// re-crawl the way a full contract reingestion does). This is the right
// tool for right after pointing the gallery at a new/freshly-indexed
// contract. The job runs in the background on Alchemy's side; calling
// this again later is safe and just reports current progress.
export async function refreshContractMetadata(
  contractAddress: string,
  chainId: number,
): Promise<{ refreshState: string; progress: string | null }> {
  const alchemy = alchemyForChain(chainId);
  const result = await alchemy.nft.refreshContract(contractAddress);
  return { refreshState: result.refreshState, progress: result.progress };
}
