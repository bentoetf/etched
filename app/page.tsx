"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader } from "./components/SiteHeader";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { compressImage, CompressResult } from "@/lib/compress";
import { clientRpcUrl, fmtKb, HARD_CAP, explorerAddr, explorerTx } from "@/lib/config";
import { getQuote, Quote, solStr } from "@/lib/pricing";
import {
  inscribeImage,
  registerPlugins,
  InscribeProgress,
  InscribeResult,
} from "@/lib/inscribe";

interface WallEntry {
  mint: string;
  inscriptionAccount: string;
  sizeBytes: number;
  ts: number;
}

function WallStrip() {
  const [entries, setEntries] = useState<WallEntry[] | null>(null);
  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);
  const items = (entries ?? []).slice(0, 7);
  return (
    <div className="wall-strip-section">
      <div className="wall-divider">
        <span className="wall-divider-line" />
        <a href="/gallery" className="wall-divider-label">
          The Wall
        </a>
        <span className="wall-divider-line" />
      </div>
      <div className="wall-strip">
        {items.length > 0
          ? items.map((e, i) => (
              <a
                className="strip-card"
                key={e.inscriptionAccount}
                href="/gallery"
              >
                <span className="strip-num">
                  #{String(i + 1).padStart(6, "0")}
                </span>
                <span className="strip-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/inscription/${e.inscriptionAccount}`}
                    alt="inscription"
                    loading="lazy"
                  />
                </span>
                <span className="strip-kb">
                  {(e.sizeBytes / 1024).toFixed(0)} KB
                </span>
              </a>
            ))
          : Array.from({ length: 7 }, (_, i) => (
              <a className="strip-card empty" key={i} href="/gallery">
                <span className="strip-num">
                  #{String(i + 1).padStart(6, "0")}
                </span>
                <span className="strip-img vacant">
                  <span className="vacant-mark">?</span>
                </span>
                <span className="strip-kb">yours</span>
              </a>
            ))}
        <a href="/gallery" className="strip-arrow" aria-label="open the wall">
          ›
        </a>
      </div>
    </div>
  );
}

export default function Home() {
  const wallet = useWallet();
  const fileInput = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressed, setCompressed] = useState<CompressResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [progress, setProgress] = useState<InscribeProgress | null>(null);
  const [result, setResult] = useState<InscribeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live price quote whenever a file is selected.
  useEffect(() => {
    if (!compressed) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    const conn = new Connection(clientRpcUrl(), "confirmed");
    getQuote(conn, compressed.bytes.length)
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch(() => {
        if (!cancelled) setError("Could not fetch price quote, try again.");
      })
      .finally(() => {
        if (!cancelled) setQuoting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [compressed]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setCompressed(null);
    if (!file.type.startsWith("image/")) {
      setError("Drop an image file.");
      return;
    }
    setCompressing(true);
    try {
      const out = await compressImage(file);
      if (out.bytes.length > HARD_CAP) {
        setError("Image is over the 200kb hard cap even after compression.");
        return;
      }
      setCompressed(out);
      const blob = new Blob([out.bytes.buffer as ArrayBuffer], { type: out.mime });
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      setError(e.message || "Compression failed");
    } finally {
      setCompressing(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const inscribe = useCallback(async () => {
    if (!compressed || !quote || !wallet.connected) return;
    setError(null);
    setProgress({
      stage: "mint",
      chunksDone: 0,
      chunksTotal: 1,
      message: "Preparing...",
    });
    try {
      const umi = registerPlugins(
        createUmi(clientRpcUrl()).use(walletAdapterIdentity(wallet))
      );
      const res = await inscribeImage(
        umi,
        compressed.bytes,
        compressed.mime,
        quote.serviceFeeLamports,
        setProgress
      );
      setResult(res);
      // best-effort gallery record
      try {
        await fetch("/api/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mint: res.mint,
            inscriptionAccount: res.inscriptionAccount,
            sizeBytes: compressed.bytes.length,
            mime: compressed.mime,
          }),
        });
      } catch {}
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Inscription failed");
    } finally {
      setProgress(null);
    }
  }, [compressed, quote, wallet]);

  const pct = progress
    ? progress.stage === "write"
      ? Math.round((progress.chunksDone / progress.chunksTotal) * 100)
      : progress.stage === "done"
        ? 100
        : 5
    : 0;

  return (
    <div className="page">
      <SiteHeader active="inscribe" />

      <div className="hero">
        <h1 className="hero-title">Etched</h1>
        <div className="tagline">
          <span className="ornament left" />
          <span className="tagline-text">
            your jpeg lives on chain. forever.
          </span>
          <span className="ornament right" />
        </div>
      </div>

      <div className="main-col">
      {result ? (
        <div className="slab success">
          <h2>Etched forever.</h2>
          <p className="muted">
            Your image now lives inside a Solana account. No IPFS, no server,
            no link rot. View the raw bytes any time:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/inscription/${result.inscriptionAccount}`}
            alt="inscribed"
            className="preview-img"
          />
          <ul>
            <li>
              <b>View image (on-chain bytes):</b>{" "}
              <a
                href={`/api/inscription/${result.inscriptionAccount}`}
                target="_blank"
              >
                /api/inscription/{result.inscriptionAccount.slice(0, 8)}...
              </a>
            </li>
            <li>
              <b>NFT mint:</b>{" "}
              <a href={explorerAddr(result.mint)} target="_blank">
                {result.mint}
              </a>
            </li>
            <li>
              <b>Inscription account:</b>{" "}
              <a href={explorerAddr(result.inscriptionAccount)} target="_blank">
                {result.inscriptionAccount}
              </a>
            </li>
            <li>
              <b>Last tx:</b>{" "}
              <a href={explorerTx(result.signature)} target="_blank">
                {result.signature.slice(0, 20)}...
              </a>
            </li>
          </ul>
          <br />
          <button
            className="btn"
            onClick={() => {
              setResult(null);
              setCompressed(null);
              setPreviewUrl(null);
              setQuote(null);
            }}
          >
            Etch another
          </button>
        </div>
      ) : (
        <>
          <div className="slab">
            {!compressed ? (
              <div
                className={`dropzone ${drag ? "drag" : ""}`}
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
              >
                <div className="dz-icon">
                  <svg
                    width="52"
                    height="52"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#8d8a81"
                    strokeWidth="1.4"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="M3 17l5-5 4 4 3-3 6 6" />
                  </svg>
                </div>
                <div className="dz-title">
                  {compressing ? "compressing..." : "drop your meme"}
                </div>
                <div className="dz-hint">
                  jpg / jpeg / png • auto-compressed • max 200kb on chain
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            ) : (
              <>
                {previewUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={previewUrl} alt="preview" className="preview-img" />
                )}
                <div className="stats">
                  <div className="stat">
                    size: <b>{fmtKb(compressed.bytes.length)}</b>
                  </div>
                  <div className="stat">
                    {compressed.width}x{compressed.height}
                  </div>
                  <div className="stat">
                    total:{" "}
                    <b>
                      {quoting
                        ? "quoting..."
                        : quote
                          ? `${solStr(quote.totalLamports)} SOL`
                          : "-"}
                    </b>
                  </div>
                </div>
                {quote && !quoting && (
                  <div className="cost-card">
                    <div className="sol-medallion">
                      <svg width="38" height="32" viewBox="0 0 36 30" fill="none">
                        <path d="M6 2h26l-5 6H1l5-6z" fill="#c49a4a" />
                        <path d="M6 12h26l-5 6H1l5-6z" transform="scale(-1,1) translate(-33,0)" fill="#c49a4a" />
                        <path d="M6 22h26l-5 6H1l5-6z" fill="#c49a4a" />
                      </svg>
                    </div>
                    <div>
                      <div className="cost-main">
                        {fmtKb(compressed.bytes.length)} image, total{" "}
                        <span className="gold">
                          {solStr(quote.totalLamports)} SOL
                        </span>
                      </div>
                      <div className="cost-rows">
                        <span>
                          on-chain rent ({fmtKb(compressed.bytes.length)})
                        </span>
                        <span className="val">
                          {solStr(quote.rentLamports + quote.overheadLamports)} SOL
                        </span>
                        <span>service fee</span>
                        <span className="val">
                          {solStr(quote.serviceFeeLamports)} SOL
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {progress ? (
                  <>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="progress-label">{progress.message}</div>
                  </>
                ) : (
                  <button
                    className="btn"
                    disabled={!wallet.connected || !quote || quoting}
                    onClick={inscribe}
                  >
                    {wallet.connected
                      ? quote
                        ? `Etch it for ${solStr(quote.totalLamports)} SOL`
                        : "Fetching quote..."
                      : "Connect wallet to inscribe"}
                  </button>
                )}
                {!progress && (
                  <p
                    className="muted"
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      marginTop: 12,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setCompressed(null);
                      setPreviewUrl(null);
                      setQuote(null);
                    }}
                  >
                    pick a different image
                  </p>
                )}
              </>
            )}
            {error && <div className="error">{error}</div>}
          </div>

          <div className="tiers">
            Pricing is dynamic: on-chain rent for your image size, plus a
            service fee. Your image lives in a Solana account forever, no IPFS.
            Hard cap 200kb. Mainnet.
          </div>
        </>
      )}
      </div>
      <section className="ritual-section">
        <div className="ritual-label">The Ritual</div>
        <div className="ritual-grid">
          <div className="ritual-step">
            <span className="ritual-num">01</span>
            <span className="ritual-h">Drop</span>
            <p>
              Your image is compressed in the browser and measured. It never
              touches a server.
            </p>
          </div>
          <div className="ritual-step">
            <span className="ritual-num">02</span>
            <span className="ritual-h">Quote</span>
            <p>
              Account rent for the exact byte count, plus the service fee for
              the tier it landed in. Shown before you sign.
            </p>
          </div>
          <div className="ritual-step">
            <span className="ritual-num">03</span>
            <span className="ritual-h">Etch</span>
            <p>
              One signature, then the bytes stream on chain in 850-byte
              chunks. You watch it get cut.
            </p>
          </div>
        </div>
      </section>
      <WallStrip />
    </div>
  );
}
