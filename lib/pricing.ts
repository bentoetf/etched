import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Dynamic price quote for an inscription of `imageBytes` size.
// total = on-chain rent (inscription account + metadata/NFT overhead)
//       + service fee (25% margin, minimum 0.02 SOL)
// The service fee is transferred to FEE_WALLET inside the same transaction
// as the inscription init so a hostile client cannot skip it.

// Inscription metadata PDA plus overhead beyond the raw image bytes.
export const INSCRIPTION_OVERHEAD_BYTES = 500;

// Fixed estimate for NFT accounts created by createNft
// (mint + token account + metadata + master edition), about 0.021 SOL.
export const NFT_OVERHEAD_LAMPORTS = Math.round(0.021 * LAMPORTS_PER_SOL);

export const MARGIN = 0.25;
export const MIN_SERVICE_FEE_LAMPORTS = Math.round(0.02 * LAMPORTS_PER_SOL);

export interface Quote {
  imageBytes: number;
  rentLamports: number; // rent for inscription data account
  overheadLamports: number; // NFT account creation estimate
  serviceFeeLamports: number; // our margin, paid to FEE_WALLET in the init tx
  totalLamports: number;
}

export async function getQuote(
  connection: Connection,
  imageBytes: number
): Promise<Quote> {
  const rentLamports = await withRetry(() =>
    connection.getMinimumBalanceForRentExemption(
      imageBytes + INSCRIPTION_OVERHEAD_BYTES
    )
  );
  const onChain = rentLamports + NFT_OVERHEAD_LAMPORTS;
  const serviceFeeLamports = Math.max(
    Math.round(onChain * MARGIN),
    MIN_SERVICE_FEE_LAMPORTS
  );
  return {
    imageBytes,
    rentLamports,
    overheadLamports: NFT_OVERHEAD_LAMPORTS,
    serviceFeeLamports,
    totalLamports: onChain + serviceFeeLamports,
  };
}

export function solStr(lamports: number, dp = 4): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(dp);
}

// Simple retry with backoff for rate-limited public RPC.
export async function withRetry<T>(
  fn: () => Promise<T>,
  tries = 4,
  baseMs = 500
): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, baseMs * Math.pow(2, i)));
    }
  }
  throw lastErr;
}
