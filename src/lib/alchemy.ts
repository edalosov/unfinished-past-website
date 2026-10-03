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
// small marketplace thumbnails, which looks soft/blurry blown up into the
// large single-piece views. Preferring the original for quality is safe
// because useFallbackImage already cascades to the next candidate on a
// load failure, so this doesn't trade away the reliability cachedUrl was
// originally chosen for — it's just no longer tried first.
function candidateImages(nft: {
  image?: { cachedUrl?: string; originalUrl?: string };
  raw?: { metadata?: { image?: string } };
}): string[] {
  const candidates = [nft.image?.originalUrl, nft.image?.cachedUrl, nft.raw?.metadata?.image]
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
