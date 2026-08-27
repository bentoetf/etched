// Core inscription flow: mint NFT, initialize inscription + allocate +
// service fee in ONE transaction (fee cannot be skipped), then write image
// bytes in chunks.
import {
  generateSigner,
  percentAmount,
  publicKey,
  lamports,
  transactionBuilder,
  Umi,
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
} from "@metaplex-foundation/mpl-inscription";
import { transferSol, mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import { CHUNK_SIZE, FEE_WALLET } from "./config";

export interface InscribeProgress {
  stage: "mint" | "init" | "write" | "done";
  chunksDone: number;
  chunksTotal: number;
  message: string;
}

export interface InscribeResult {
  mint: string;
  inscriptionAccount: string;
  inscriptionMetadata: string;
  signature: string;
}

export function registerPlugins(umi: Umi): Umi {
  return umi.use(mplTokenMetadata()).use(mplInscription()).use(mplToolbox());
}

export async function inscribeImage(
  umi: Umi,
  imageBytes: Uint8Array,
  mime: string,
  serviceFeeLamports: number,
  onProgress: (p: InscribeProgress) => void
): Promise<InscribeResult> {
  const chunksTotal = Math.ceil(imageBytes.length / CHUNK_SIZE);

  // 1. Mint the NFT that will own the inscription.
  onProgress({
    stage: "mint",
    chunksDone: 0,
    chunksTotal,
    message: "Minting NFT...",
  });
  const mint = generateSigner(umi);
  await createNft(umi, {
    mint,
    name: "Etched Inscription",
    symbol: "ETCH",
    uri: "https://etched.example/placeholder.json",
    sellerFeeBasisPoints: percentAmount(0),
  }).sendAndConfirm(umi);

  // 2. Initialize inscription + allocate + service fee, atomically.
  //    The fee transfer rides in the SAME tx as the inscription init, so
  //    a client cannot get an inscription started without paying.
  onProgress({
    stage: "init",
    chunksDone: 0,
    chunksTotal,
    message: "Initializing inscription + paying service fee...",
  });
  const inscriptionAccount = findMintInscriptionPda(umi, {
    mint: mint.publicKey,
  });
  const inscriptionMetadataAccount = findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount[0],
  });

  await transactionBuilder()
    .add(
      initializeFromMint(umi, {
        mintAccount: mint.publicKey,
      })
    )
    .add(
      allocate(umi, {
        inscriptionAccount: inscriptionAccount[0],
        inscriptionMetadataAccount,
        associatedTag: none(),
        targetSize: imageBytes.length,
      })
    )
    .add(
      transferSol(umi, {
        destination: publicKey(FEE_WALLET.toBase58()),
        amount: lamports(BigInt(serviceFeeLamports)),
      })
    )
    .sendAndConfirm(umi);

  // 3. Write image bytes in chunks, one tx per chunk.
  let lastSig = "";
  for (let i = 0; i < chunksTotal; i++) {
    const offset = i * CHUNK_SIZE;
    const value = imageBytes.slice(offset, offset + CHUNK_SIZE);
    onProgress({
      stage: "write",
      chunksDone: i,
      chunksTotal,
      message: `Writing chunk ${i + 1} of ${chunksTotal}...`,
    });
    const res = await writeData(umi, {
      inscriptionAccount: inscriptionAccount[0],
      inscriptionMetadataAccount,
      associatedTag: none(),
      offset,
      value,
    }).sendAndConfirm(umi);
    lastSig = base58Sig(res.signature);
  }

  onProgress({
    stage: "done",
    chunksDone: chunksTotal,
    chunksTotal,
    message: "Etched.",
  });

  return {
    mint: mint.publicKey.toString(),
    inscriptionAccount: inscriptionAccount[0].toString(),
    inscriptionMetadata: inscriptionMetadataAccount[0].toString(),
    signature: lastSig,
  };
}

function base58Sig(sig: Uint8Array): string {
  const ALPHABET =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let x = BigInt(0);
  for (const b of sig) x = (x << BigInt(8)) + BigInt(b);
  let out = "";
  while (x > BigInt(0)) {
    out = ALPHABET[Number(x % BigInt(58))] + out;
    x /= BigInt(58);
  }
  for (const b of sig) {
    if (b === 0) out = "1" + out;
    else break;
  }
  return out;
}
