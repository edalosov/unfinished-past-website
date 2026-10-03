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

// For this contract, Alchemy's own `image`/`raw.metadata` fields turned out
// to be unreliable: inspecting a token directly showed `image: {}` (totally
// empty) and `raw.metadata` populated with OpenSea's catalog shape
// (identifier/collection/opensea_url/owners/…) instead of the token's real
// metadata JSON — meaning Alchemy substituted OpenSea's own cache for this
// collection rather than reading the actual tokenURI, and that cache is
// missing or square-cropped. `raw.tokenUri` is the one field that still
// reflects the genuine on-chain pointer, so fetch it ourselves and read its
// real "image" field directly, bypassing Alchemy's broken indexing for this
// contract entirely. Failures here (network hiccup, bad tokenUri) just fall
// back to whatever Alchemy did resolve.
async function fetchTokenUriImage(tokenUri: string | undefined): Promise<string | null> {
  const url = normalizeImageUrl(tokenUri);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const metadata = await res.json();
    return normalizeImageUrl(metadata?.image ?? metadata?.image_url ?? null);
  } catch {
    return null;
  }
}

// Alchemy's cachedUrl is its own resized/recompressed copy, optimized for
// small marketplace thumbnails (often center-cropped to a square besides),
// which is a bad look blown up into the large single-piece views — so it's
// tried last, as the true last resort. The directly-fetched tokenUri image
// comes first since it's the one source that can't be mangled by Alchemy's
// own indexing; originalUrl and raw.metadata.image are kept as a fallback
// in between for when the direct fetch fails (useFallbackImage already
// cascades to the next candidate on a load failure, so keeping all of them
// costs nothing).
async function candidateImages(nft: {
  image?: { cachedUrl?: string; originalUrl?: string };
  raw?: { metadata?: { image?: string }; tokenUri?: string };
}): Promise<string[]> {
  const directImage = await fetchTokenUriImage(nft.raw?.tokenUri);
  const candidates = [directImage, nft.image?.originalUrl, nft.raw?.metadata?.image, nft.image?.cachedUrl]
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

  return Promise.all(
    response.ownedNfts.map(async (nft) => ({
      tokenId: nft.tokenId,
      name: nft.name || nft.raw?.metadata?.name || `#${nft.tokenId}`,
      images: await candidateImages(nft),
    })),
  );
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
    images: await candidateImages(nft),
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

// Returns every image-related field Alchemy has for one token, plus the
// raw, unprocessed metadata JSON and the tokenURI it came from — for
// figuring out which field (if any) actually points at the real
// full-resolution source, when the usual candidates are all coming back
// wrong (e.g. square-cropped) for a given token.
export async function getRawTokenMetadata(
  contractAddress: string,
  tokenId: string,
  chainId: number,
) {
  const alchemy = alchemyForChain(chainId);
  const nft = await alchemy.nft.getNftMetadata(contractAddress, tokenId);
  return {
    name: nft.name ?? null,
    image: nft.image ?? null,
    tokenUri: nft.raw?.tokenUri ?? null,
    rawMetadataError: nft.raw?.error ?? null,
    rawMetadata: nft.raw?.metadata ?? null,
    directImageFromTokenUri: await fetchTokenUriImage(nft.raw?.tokenUri),
  };
}
