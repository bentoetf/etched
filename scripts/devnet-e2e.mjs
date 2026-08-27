// Devnet end-to-end test of the Etched inscription flow.
// Reuses lib/inscribe.ts via Node's native TypeScript type stripping.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity } from "@metaplex-foundation/umi";
import { fetchInscription } from "@metaplex-foundation/mpl-inscription";
import { publicKey } from "@metaplex-foundation/umi";
import { registerPlugins, inscribeImage } from "../lib/inscribe.ts";

const RPC = "https://api.devnet.solana.com";
const KEYPAIR_PATH = path.join(os.homedir(), ".config/solana/etched-devnet.json");
const IMAGE_PATH = process.argv[2] || path.join(process.cwd(), "scripts/test-image.png");

const umi = registerPlugins(createUmi(RPC));
const secret = new Uint8Array(JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8")));
const kp = umi.eddsa.createKeypairFromSecretKey(secret);
umi.use(keypairIdentity(kp));
console.log("Payer:", kp.publicKey.toString());

const imageBytes = new Uint8Array(fs.readFileSync(IMAGE_PATH));
console.log("Image:", IMAGE_PATH, imageBytes.length, "bytes");

const balBefore = await umi.rpc.getBalance(kp.publicKey);
console.log("Balance before:", Number(balBefore.basisPoints) / 1e9, "SOL");

const result = await inscribeImage(umi, imageBytes, "image/png", 0.001, (p) =>
  console.log(`[${p.stage}] ${p.message}`)
);

console.log("Mint:", result.mint);
console.log("Inscription account:", result.inscriptionAccount);
console.log("Inscription metadata:", result.inscriptionMetadata);
console.log("Last signature:", result.signature);

// Verify bytes on chain.
const onchain = await fetchInscription(umi, publicKey(result.inscriptionAccount));
const match =
  onchain.length === imageBytes.length &&
  onchain.every((b, i) => b === imageBytes[i]);
console.log("On-chain bytes:", onchain.length, "match:", match ? "YES" : "NO");

const balAfter = await umi.rpc.getBalance(kp.publicKey);
console.log("Balance after:", Number(balAfter.basisPoints) / 1e9, "SOL");
console.log(
  "Total SOL spent:",
  (Number(balBefore.basisPoints) - Number(balAfter.basisPoints)) / 1e9
);

console.log("Explorer links:");
console.log(`  mint: https://explorer.solana.com/address/${result.mint}?cluster=devnet`);
console.log(`  inscription: https://explorer.solana.com/address/${result.inscriptionAccount}?cluster=devnet`);
console.log(`  last tx: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);

if (!match) process.exit(1);
