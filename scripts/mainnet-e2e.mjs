// Mainnet end-to-end test of the Etched inscription flow.
// Inlines the inscribe flow (no service fee: config FEE_WALLET is a placeholder).
// Real funds. Retry/backoff for public RPC rate limits.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  keypairIdentity,
  generateSigner,
  percentAmount,
  publicKey,
  transactionBuilder,
  none,
} from "@metaplex-foundation/umi";
import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  mplInscription,
  initializeFromMint,
  allocate,
  writeData,
  findMintInscriptionPda,
  findInscriptionMetadataPda,
  fetchInscription,
} from "@metaplex-foundation/mpl-inscription";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";

const RPC = "https://api.mainnet-beta.solana.com";
const KEYPAIR_PATH = path.join(os.homedir(), ".config/solana/etched-mainnet.json");
const IMAGE_PATH = process.argv[2] || path.join(process.cwd(), "scripts/test-image.png");
const CHUNK_SIZE = 850;
const BUDGET_SOL = 0.15;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(label, fn, tries = 5) {
  let delay = 1500;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === tries) throw e;
      console.log(`[retry] ${label} failed (attempt ${i}): ${e.message?.slice(0, 120)}; waiting ${delay}ms`);
      await sleep(delay);
      delay *= 2;
    }
  }
}

const umi = createUmi(RPC).use(mplTokenMetadata()).use(mplInscription()).use(mplToolbox());
const secret = new Uint8Array(JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8")));
const kp = umi.eddsa.createKeypairFromSecretKey(secret);
umi.use(keypairIdentity(kp));
console.log("Payer:", kp.publicKey.toString());

const imageBytes = new Uint8Array(fs.readFileSync(IMAGE_PATH));
console.log("Image:", IMAGE_PATH, imageBytes.length, "bytes");
const chunksTotal = Math.ceil(imageBytes.length / CHUNK_SIZE);

// Budget guard.
const rentInscription = await withRetry("rent(image)", () =>
  umi.rpc.getRent({ bytes: imageBytes.length })
);
const rentEstimateLamports =
  Number(rentInscription.basisPoints) + // inscription data account
  3_000_000 + // mint + token + metadata + master edition rent, rough
  1_000_000 + // inscription metadata account, rough
  (chunksTotal + 4) * 10_000; // tx fees with headroom
const rentEstimateSol = rentEstimateLamports / 1e9;
console.log("Estimated total cost:", rentEstimateSol.toFixed(6), "SOL (budget", BUDGET_SOL, "SOL)");
if (rentEstimateSol > BUDGET_SOL) {
  console.error("ABORT: estimated cost exceeds budget");
  process.exit(2);
}

const balBefore = await withRetry("balance", () => umi.rpc.getBalance(kp.publicKey));
console.log("Balance before:", Number(balBefore.basisPoints) / 1e9, "SOL");

// 1. Mint NFT.
console.log("Minting NFT...");
const mint = generateSigner(umi);
await withRetry("mint", () =>
  createNft(umi, {
    mint,
    name: "Etched Inscription",
    symbol: "ETCH",
    uri: "https://etched.example/placeholder.json",
    sellerFeeBasisPoints: percentAmount(0),
  }).sendAndConfirm(umi)
);
console.log("Mint:", mint.publicKey.toString());

// 2. Initialize inscription + allocate.
console.log("Initializing inscription...");
const inscriptionAccount = findMintInscriptionPda(umi, { mint: mint.publicKey });
const inscriptionMetadataAccount = findInscriptionMetadataPda(umi, {
  inscriptionAccount: inscriptionAccount[0],
});
await withRetry("init+allocate", () =>
  transactionBuilder()
    .add(initializeFromMint(umi, { mintAccount: mint.publicKey }))
    .add(
      allocate(umi, {
        inscriptionAccount: inscriptionAccount[0],
        inscriptionMetadataAccount,
        associatedTag: none(),
        targetSize: imageBytes.length,
      })
    )
    .sendAndConfirm(umi)
);
console.log("Inscription account:", inscriptionAccount[0].toString());

// 3. Write chunks.
let lastSig = "";
for (let i = 0; i < chunksTotal; i++) {
  const offset = i * CHUNK_SIZE;
  const value = imageBytes.slice(offset, offset + CHUNK_SIZE);
  console.log(`Writing chunk ${i + 1}/${chunksTotal} (offset ${offset})`);
  const res = await withRetry(`write chunk ${i + 1}`, () =>
    writeData(umi, {
      inscriptionAccount: inscriptionAccount[0],
      inscriptionMetadataAccount,
      associatedTag: none(),
      offset,
      value,
    }).sendAndConfirm(umi)
  );
  lastSig = base58Sig(res.signature);
  await sleep(400); // be gentle on public RPC
}

// 4. Verify.
const onchain = await withRetry("fetch inscription", () =>
  fetchInscription(umi, publicKey(inscriptionAccount[0]))
);
const match =
  onchain.length === imageBytes.length && onchain.every((b, j) => b === imageBytes[j]);
console.log("On-chain bytes:", onchain.length, "match:", match ? "YES" : "NO");

const balAfter = await withRetry("balance after", () => umi.rpc.getBalance(kp.publicKey));
const spent = (Number(balBefore.basisPoints) - Number(balAfter.basisPoints)) / 1e9;
console.log("Balance after:", Number(balAfter.basisPoints) / 1e9, "SOL");
console.log("Total SOL spent:", spent);
console.log("Rent estimate (inscription data account):", Number(rentInscription.basisPoints) / 1e9, "SOL");
console.log("Explorer links:");
console.log(`  mint: https://explorer.solana.com/address/${mint.publicKey.toString()}`);
console.log(`  inscription: https://explorer.solana.com/address/${inscriptionAccount[0].toString()}`);
console.log(`  last tx: https://explorer.solana.com/tx/${lastSig}`);

if (!match) process.exit(1);

function base58Sig(sig) {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let x = 0n;
  for (const b of sig) x = (x << 8n) + BigInt(b);
  let out = "";
  while (x > 0n) {
    out = ALPHABET[Number(x % 58n)] + out;
    x /= 58n;
  }
  for (const b of sig) {
    if (b === 0) out = "1" + out;
    else break;
  }
  return out;
}
