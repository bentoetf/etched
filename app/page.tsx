"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
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

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (m) => m.WalletMultiButton
    ),
  { ssr: false }
);

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
    <div className="container">
      <div className="header">
        <div className="logo">
          ETCHED <span>$ETCH</span>
        </div>
        <div className="nav">
          <Link href="/gallery">gallery</Link>
          <WalletMultiButton />
        </div>
      </div>

      {result ? (
        <div className="panel success">
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
          <div className="panel">
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
                {compressing
                  ? "Compressing..."
                  : "Drop a meme here, or click to pick one. It gets compressed and etched into a Solana account forever. No IPFS."}
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
                  <div className="quote-breakdown muted" style={{ fontSize: 12, textAlign: "center", marginBottom: 12 }}>
                    on-chain rent {solStr(quote.rentLamports + quote.overheadLamports)} SOL
                    {" + "}service fee {solStr(quote.serviceFeeLamports)} SOL
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
  );
}
