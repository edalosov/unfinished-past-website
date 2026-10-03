import { Alchemy, Network } from "alchemy-sdk";
import { createPublicClient, http, type Address } from "viem";
import { mainnet, sepolia } from "viem/chains";

const networkForChainId: Record<number, Network> = {
  1: Network.ETH_MAINNET,
  11155111: Network.ETH_SEPOLIA,
};

const viemChainForId = { 1: mainnet, 11155111: sepolia } as const;
const alchemyRpcSubdomainForId: Record<number, string> = {
  1: "eth-mainnet",
  11155111: "eth-sepolia",
};

function alchemyForChain(chainId: number) {
  const network = networkForChainId[chainId];
  if (!network) throw new Error(`Unsupported chainId: ${chainId}`);
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new Error("ALCHEMY_API_KEY is not set");
  return new Alchemy({ apiKey, network });
}

function viemClientForChain(chainId: number) {
  const chain = viemChainForId[chainId as keyof typeof viemChainForId];
  const subdomain = alchemyRpcSubdomainForId[chainId];
  if (!chain || !subdomain) throw new Error(`Unsupported chainId: ${chainId}`);
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new Error("ALCHEMY_API_KEY is not set");
  return createPublicClient({ chain, transport: http(`https://${subdomain}.g.alchemy.com/v2/${apiKey}`) });
}

const tokenUriAbi = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

// Reads the token's tokenURI straight from the contract instead of trusting
// Alchemy's own indexed copy of it (raw.tokenUri). That copy is what kept
// lagging behind real on-chain changes in testing — once an artist updates
// a token's metadata pointer, Alchemy can take a while (and its own cooldown)
// to notice. A direct contract read always reflects current chain state, so
// there's nothing to wait on. Falls back to null on any failure (bad
// contract, network hiccup) so the caller can fall back to Alchemy's copy.
async function getOnChainTokenUri(
  contractAddress: string,
  tokenId: string,
  chainId: number,
): Promise<string | null> {
  try {
    const client = viemClientForChain(chainId);
    const uri = await client.readContract({
      address: contractAddress as Address,
      abi: tokenUriAbi,
      functionName: "tokenURI",
      args: [BigInt(tokenId)],
    });
    return typeof uri === "string" && uri.length > 0 ? uri : null;
  } catch {
    return null;
  }
}

function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${url.slice("ipfs://".length)}`;
  }
  return url;
}

// Alchemy's own `image`/`raw.metadata` fields turned out to be unreliable
// for at least one contract: inspecting a token directly showed `image: {}`
// (totally empty) and `raw.metadata` populated with OpenSea's catalog shape
// (identifier/collection/opensea_url/owners/…) instead of the token's real
// metadata JSON — Alchemy had substituted OpenSea's own cache rather than
// reading the actual tokenURI. Fetching the tokenURI's content ourselves
// sidesteps that, but still needed Alchemy's raw.tokenUri to know *what*
// the tokenURI is — and that field can itself lag behind an on-chain change
// (see getOnChainTokenUri). So this takes a tokenUri we've already resolved
// (on-chain, ideally) and just reads its real "image" field directly.
// Failures here (network hiccup, bad tokenUri) return null for the caller
// to fall back to Alchemy's own candidates.
async function fetchTokenUriImage(tokenUri: string | null | undefined): Promise<string | null> {
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
// tried last, as the true last resort. The directly-fetched image comes
// first, read from the tokenURI as it exists on-chain right now (not
// Alchemy's indexed copy of it), since that's the one source that can't be
// stale or mangled by Alchemy's own indexing. originalUrl and
// raw.metadata.image are kept as a fallback in between for when the direct
// fetch fails (useFallbackImage already cascades to the next candidate on
// a load failure, so keeping all of them costs nothing).
async function candidateImages(
  nft: {
    image?: { cachedUrl?: string; originalUrl?: string };
    raw?: { metadata?: { image?: string }; tokenUri?: string };
  },
  contractAddress: string,
  tokenId: string,
  chainId: number,
): Promise<string[]> {
  const onChainTokenUri = await getOnChainTokenUri(contractAddress, tokenId, chainId);
  const directImage = await fetchTokenUriImage(onChainTokenUri ?? nft.raw?.tokenUri);
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
      images: await candidateImages(nft, contractAddress, nft.tokenId, chainId),
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
    images: await candidateImages(nft, contractAddress, tokenId, chainId),
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
  const onChainTokenUri = await getOnChainTokenUri(contractAddress, tokenId, chainId);
  return {
    name: nft.name ?? null,
    image: nft.image ?? null,
    alchemyCachedTokenUri: nft.raw?.tokenUri ?? null,
    onChainTokenUri,
    rawMetadataError: nft.raw?.error ?? null,
    rawMetadata: nft.raw?.metadata ?? null,
    directImageFromTokenUri: await fetchTokenUriImage(onChainTokenUri ?? nft.raw?.tokenUri),
  };
}
