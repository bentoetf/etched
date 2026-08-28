"use client";

import { useEffect, useState } from "react";
import { explorerAddr } from "@/lib/config";
import { SiteHeader } from "../components/SiteHeader";

interface Entry {
  mint: string;
  inscriptionAccount: string;
  sizeBytes: number;
  mime: string;
  ts: number;
}

export default function Gallery() {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  return (
    <div className="page">
      <SiteHeader active="wall" />

      <div className="hero">
        <h1 className="hero-title">The Wall</h1>
        <div className="tagline">
          <span className="ornament left" />
          <span className="tagline-text">
            every meme inscribed on solana, forever
          </span>
          <span className="ornament right" />
        </div>
      </div>

      {entries === null ? (
        <p className="muted wall-status">reading the stone...</p>
      ) : entries.length === 0 ? (
        <p className="muted wall-status">
          Nothing etched yet.{" "}
          <a href="/" style={{ color: "var(--gold)" }}>
            Be the first to inscribe
          </a>
          .
        </p>
      ) : (
        <div className="gallery-grid">
          {entries.map((e) => (
            <div className="gallery-card" key={e.inscriptionAccount}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/inscription/${e.inscriptionAccount}`}
                alt="inscription"
                loading="lazy"
              />
              <div className="muted">
                {new Date(e.ts).toLocaleString()} ·{" "}
                {(e.sizeBytes / 1024).toFixed(1)}kb · {e.mime}
              </div>
              <div style={{ margin: "8px 0" }}>
                <a href={explorerAddr(e.inscriptionAccount)} target="_blank">
                  inscription ↗
                </a>
              </div>
              <div>
                <a href={explorerAddr(e.mint)} target="_blank">
                  nft mint ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ height: 72 }} />
    </div>
  );
}
