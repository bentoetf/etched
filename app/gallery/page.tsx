"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { explorerAddr } from "@/lib/config";

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
    <div className="container">
      <div className="header">
        <div className="logo">
          ETCHED <span>$ETCH</span>
        </div>
        <div className="nav">
          <Link href="/">inscribe</Link>
        </div>
      </div>
      <h2 style={{ marginBottom: 16 }}>Gallery</h2>
      {entries === null ? (
        <p className="muted">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="muted">Nothing etched yet. Be the first.</p>
      ) : (
        <div className="gallery-grid">
          {entries.map((e) => (
            <div className="gallery-card" key={e.inscriptionAccount}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/inscription/${e.inscriptionAccount}`}
                alt="inscription"
                style={{ width: "100%", borderRadius: 8, marginBottom: 8 }}
                loading="lazy"
              />
              <div className="muted">
                {new Date(e.ts).toLocaleString()} ·{" "}
                {(e.sizeBytes / 1024).toFixed(1)}kb · {e.mime}
              </div>
              <div style={{ margin: "8px 0" }}>
                <a
                  href={explorerAddr(e.inscriptionAccount)}
                  target="_blank"
                >
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
    </div>
  );
}
