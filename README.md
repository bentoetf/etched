# Etched ($ETCH)

Etch memes on Solana forever. Drop an image, it gets compressed client-side, then inscribed on-chain via the Metaplex Inscription program. The user mints an NFT that owns the inscription and pays a size-tiered service fee.

Devnet only, day-1 scaffold.

## Run

```bash
npm install --legacy-peer-deps
npm run dev        # http://localhost:3000
npm run build      # production build
```

You need Phantom or Solflare set to devnet with some devnet SOL (`solana airdrop 2 <pubkey> -u devnet` or https://faucet.solana.com).

## Fee tiers (client-side)

- up to 25kb: 0.05 SOL
- up to 50kb: 0.09 SOL
- up to 100kb: 0.15 SOL
- up to 200kb: 0.25 SOL (hard cap)

Images are compressed to webp (jpeg fallback) with descending quality/scale until they fit under 200kb.

## Flow

1. `createNft` (mpl-token-metadata): mints the NFT that owns the inscription.
2. `initializeFromMint` + `allocate` (mpl-inscription): creates the inscription PDA off the mint and allocates space for the image bytes.
3. `writeData` in 850-byte chunks, one tx per chunk (progress bar tracks these).
4. `transferSol` of the tier fee to `FEE_WALLET` (placeholder constant in `lib/config.ts`, swap before mainnet).

## Layout

- `lib/config.ts`: RPC, FEE_WALLET, tiers, chunk size
- `lib/compress.ts`: client-side compression
- `lib/inscribe.ts`: umi flow (mint, init, allocate, chunked writes, fee)
- `app/page.tsx`: drop zone, preview, progress, success view
- `app/gallery/page.tsx` + `app/api/gallery/route.ts`: gallery stub backed by `data/gallery.json`

## What's stubbed / remaining for mainnet

- **Fee wallet**: `FEE_WALLET` is the system program placeholder. Set a real treasury pubkey and confirm a withdraw path exists before going live (crew rule: exit path verified before launch).
- **Server-side size validation**: fees and the 200kb cap are enforced client-side only. A hostile client can skip the fee transfer entirely since the fee is a separate tx. For mainnet, either route through a backend that co-signs, or use a program that atomically bundles fee + write.
- **Gallery**: local JSON stub. Replace with a DB or getProgramAccounts scan of inscription metadata.
- **NFT metadata URI**: placeholder. Point it at real JSON (could itself be an associated inscription).
- **Retry/resume**: a failed chunk write mid-stream currently requires starting over. Add resumable writes keyed off the inscription account.
- **Devnet e2e test**: requires a browser wallet with devnet SOL; not run in CI.
