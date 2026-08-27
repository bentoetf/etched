import { PublicKey } from "@solana/web3.js";

// Client RPC goes through our /api/rpc proxy so the provider key stays
// server-side. Server code uses SERVER_RPC_URL directly.
export function clientRpcUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin + "/api/rpc";
  }
  return "https://api.mainnet-beta.solana.com";
}

// Fee wallet: we hold the key at ~/.config/solana/etched-fees.json.
export const FEE_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_FEE_WALLET ||
    "Bzfjdh6uJ6F4UjF9Yd6RW3C9Q7mRmGyW7aTCzYg2RTDB"
);

// Chunk size for inscription writes; keeps each tx under the packet limit.
export const CHUNK_SIZE = 850;

export const HARD_CAP = 200 * 1024;

export function fmtKb(bytes: number): string {
  return (bytes / 1024).toFixed(1) + " kb";
}

export function explorerAddr(addr: string): string {
  return `https://explorer.solana.com/address/${addr}`;
}

export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}`;
}
