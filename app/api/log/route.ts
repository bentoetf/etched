import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// v1 durability note: file lives on local disk. On Render this is ephemeral
// across deploys/restarts, acceptable for v1, replace with a DB later.
const DATA_FILE = path.join(process.cwd(), "data", "gallery.json");

export async function POST(req: NextRequest) {
  let entry: any;
  try {
    entry = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (
    typeof entry?.mint !== "string" ||
    typeof entry?.inscriptionAccount !== "string" ||
    entry.mint.length > 64 ||
    entry.inscriptionAccount.length > 64
  ) {
    return NextResponse.json({ error: "bad entry" }, { status: 400 });
  }
  const clean = {
    mint: entry.mint,
    inscriptionAccount: entry.inscriptionAccount,
    sizeBytes: Number(entry.sizeBytes) || 0,
    mime: String(entry.mime || "").slice(0, 32),
    ts: Date.now(),
  };
  let all: any[] = [];
  try {
    all = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  } catch {}
  all.unshift(clean);
  if (all.length > 5000) all.length = 5000;
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2));
  return NextResponse.json({ ok: true });
}
