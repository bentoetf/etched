import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

// Serves the raw inscription bytes with a real content type. This is how
// people actually SEE the image: explorers show the account, not the pixels.
const UPSTREAM =
  process.env.SERVER_RPC_URL || "https://api.mainnet-beta.solana.com";

function sniffMime(b: Uint8Array): string {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return "image/jpeg";
  if (
    b.length > 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47
  )
    return "image/png";
  if (
    b.length > 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
    return "image/webp";
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46)
    return "image/gif";
  return "application/octet-stream";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
) {
  let pk: PublicKey;
  try {
    pk = new PublicKey(params.address);
  } catch {
    return NextResponse.json({ error: "bad address" }, { status: 400 });
  }
  const conn = new Connection(UPSTREAM, "confirmed");
  const info = await conn.getAccountInfo(pk);
  if (!info || info.data.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const bytes = new Uint8Array(info.data);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": sniffMime(bytes),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
