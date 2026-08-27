import { NextRequest, NextResponse } from "next/server";

// JSON-RPC proxy so the provider API key never reaches the client bundle.
const UPSTREAM =
  process.env.SERVER_RPC_URL || "https://api.mainnet-beta.solana.com";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(UPSTREAM, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
