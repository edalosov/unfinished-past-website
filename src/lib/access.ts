import { getOwnedTokens, getTokenMetadata, resolveTokenOwner, type OwnedToken } from "@/lib/alchemy";
import { getDelegatedAccess } from "@/lib/delegateRegistry";

export type ResolvedToken = { token: OwnedToken; ownerAddress: string };

// The single source of truth for "what can `walletAddress` see/act on" —
// both resolveAccessibleTokens (the grid) and resolveTokenAccess (the
// detail page + answer submission) read from this exact same map, so a
// piece that appears in the grid can never fail the ownership check on its
// own detail page. Previously resolveTokenAccess re-derived ownership via a
// different Alchemy endpoint (getOwnersForNft) than the grid's
// (getNftsForOwner), and the two occasionally disagreed.
async function resolveAllAccessible(
  walletAddress: string,
  contractAddress: string,
  chainId: number,
): Promise<Map<string, ResolvedToken>> {
  const wallet = walletAddress.toLowerCase();
  const resolved = new Map<string, ResolvedToken>();

  const direct = await getOwnedTokens(wallet, contractAddress, chainId);
  for (const token of direct) resolved.set(token.tokenId, { token, ownerAddress: wallet });

  const { delegatedVaults, delegatedTokens } = await getDelegatedAccess(wallet, contractAddress, chainId);

  for (const vault of delegatedVaults) {
    const vaultTokens = await getOwnedTokens(vault, contractAddress, chainId);
    for (const token of vaultTokens) {
      if (!resolved.has(token.tokenId)) resolved.set(token.tokenId, { token, ownerAddress: vault });
    }
  }

  for (const { vault, tokenId } of delegatedTokens) {
    if (resolved.has(tokenId)) continue;
    // Delegation records don't disappear the instant an NFT changes hands —
    // re-confirm current ownership before trusting a single-token grant.
    const owner = await resolveTokenOwner(contractAddress, tokenId, chainId);
    if (owner !== vault) continue;
    resolved.set(tokenId, { token: await getTokenMetadata(contractAddress, tokenId, chainId), ownerAddress: vault });
  }

  return resolved;
}

// Every token `walletAddress` can see: ones it holds directly, plus ones
// held by any vault that has delegated this collection (or everything) to
// it via delegate.xyz. Each entry carries its own ownerAddress (the wallet
// or vault that actually holds it) since that — not the connected
// wallet — is what Answer rows are keyed on; a wallet with several
// delegated vaults can see tokens answered under different addresses.
export async function resolveAccessibleTokens(
  walletAddress: string,
  contractAddress: string,
  chainId: number,
): Promise<ResolvedToken[]> {
  const resolved = await resolveAllAccessible(walletAddress, contractAddress, chainId);
  return [...resolved.values()];
}

export type TokenAccess = { allowed: boolean; ownerAddress: string | null };

// Can `walletAddress` view/answer for `tokenId` — either because it holds
// the token directly, or because the actual holder has delegated it (or the
// whole collection, or everything) to this wallet via delegate.xyz?
export async function resolveTokenAccess(
  walletAddress: string,
  contractAddress: string,
  tokenId: string,
  chainId: number,
): Promise<TokenAccess> {
  const resolved = await resolveAllAccessible(walletAddress, contractAddress, chainId);
  const entry = resolved.get(tokenId);
  if (!entry) return { allowed: false, ownerAddress: null };
  return { allowed: true, ownerAddress: entry.ownerAddress };
}
