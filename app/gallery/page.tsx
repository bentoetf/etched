"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { explorerAddr } from "@/lib/config";
import { SiteHeader } from "../components/SiteHeader";

interface Entry {
  mint: string;
  inscriptionAccount: string;
  sizeBytes: number;
  mime: string;
  ts: number;
  demo?: string;
}

type SortKey = "newest" | "largest" | "oldest";
const PAGE = 12;

function ago(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function demoEntries(): Entry[] {
  const dims = [
    [400, 400], [400, 300], [300, 400], [400, 500], [500, 300],
    [400, 260], [320, 400], [400, 400], [450, 300], [300, 360],
    [400, 480], [520, 300], [360, 400], [400, 340],
  ];
  return Array.from({ length: 14 }, (_, i) => ({
    mint: `demo-mint-${i}`,
    inscriptionAccount: `demo-${i}`,
    sizeBytes: 4000 + ((i * 37211) % 190000),
    mime: "image/webp",
    ts: Date.now() - i * 47 * 60 * 1000,
    demo: `https://picsum.photos/seed/etched${i}/${dims[i][0]}/${dims[i][1]}`,
  }));
}

function GalleryInner() {
  const params = useSearchParams();
  const demo = params.get("demo") === "1";
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    if (demo) {
      setEntries(demoEntries());
      return;
    }
    fetch("/api/gallery")
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [demo]);

  const sorted = useMemo(() => {
    if (!entries) return null;
    const copy = [...entries];
    if (sort === "newest") copy.sort((a, b) => b.ts - a.ts);
    else if (sort === "oldest") copy.sort((a, b) => a.ts - b.ts);
    else copy.sort((a, b) => b.sizeBytes - a.sizeBytes);
    return copy;
  }, [entries, sort]);

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

      <div className="sort-row">
        {(
          [
            ["newest", "Newest"],
            ["largest", "Largest"],
            ["oldest", "Oldest"],
          ] as [SortKey, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            className={`plaque-btn ${sort === key ? "active" : ""}`}
            onClick={() => setSort(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted === null ? (
        <p className="muted wall-status">reading the stone...</p>
      ) : sorted.length === 0 ? (
        <div className="empty-frame">
          <div className="empty-frame-inner">
            <div className="empty-chisel">Nothing etched yet</div>
            <a href="/" className="empty-cta">
              Be the first to inscribe
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="gallery-grid">
            {sorted.slice(0, shown).map((e, i) => (
              <a
                className="stone-card"
                key={e.inscriptionAccount}
                href={e.demo ? undefined : explorerAddr(e.inscriptionAccount)}
                target={e.demo ? undefined : "_blank"}
              >
                <span className="stone-card-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      e.demo ?? `/api/inscription/${e.inscriptionAccount}`
                    }
                    alt="inscription"
                    loading="lazy"
                  />
                </span>
                <span className="brass-plaque">
                  <span className="rivet left" />
                  <span className="plaque-id">
                    #{String(i + 1).padStart(7, "0")}
                  </span>
                  <span className="plaque-meta">
                    {(e.sizeBytes / 1024).toFixed(0)} KB • {ago(e.ts)}
                  </span>
                  <span className="rivet right" />
                </span>
              </a>
            ))}
          </div>
          {sorted.length > shown && (
            <div className="load-more-row">
              <button
                className="plaque-btn load-more"
                onClick={() => setShown((n) => n + PAGE)}
              >
                Load More <span className="chev">⌄</span>
              </button>
            </div>
          )}
        </>
      )}
      <div style={{ height: 72 }} />
    </div>
  );
}

export default function Gallery() {
  return (
    <Suspense fallback={null}>
      <GalleryInner />
    </Suspense>
  );
}
