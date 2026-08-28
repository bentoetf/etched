"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

export function SiteHeader({
  active,
}: {
  active: "inscribe" | "wall" | "docs";
}) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setCount(d.length))
      .catch(() => {});
  }, []);
  return (
    <header className="site-header">
      <Link href="/" className="site-logo">
        ETCHED
      </Link>
      <nav className="site-nav">
        <Link
          href="/"
          className={`nav-link ${active === "inscribe" ? "active" : ""}`}
        >
          Inscribe
        </Link>
        <Link
          href="/gallery"
          className={`nav-link ${active === "wall" ? "active" : ""}`}
        >
          The Wall
        </Link>
        <Link
          href="/docs"
          className={`nav-link ${active === "docs" ? "active" : ""}`}
        >
          Docs
        </Link>
      </nav>
      <div className="header-right">
        {count !== null && (
          <span className="inscribed-counter">
            <b>{count.toLocaleString()}</b> inscribed
          </span>
        )}
        <span className="wallet-wrap">
          <svg
            className="wallet-ico"
            width="18"
            height="16"
            viewBox="0 0 24 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <rect x="1" y="3" width="22" height="16" rx="2.5" />
            <path d="M16 11h4" />
            <path d="M3 3.5V3a2 2 0 0 1 2-2h13" opacity="0.7" />
          </svg>
          <WalletMultiButton>
            <span className="wallet-label">Connect Wallet</span>
          </WalletMultiButton>
        </span>
      </div>
    </header>
  );
}
