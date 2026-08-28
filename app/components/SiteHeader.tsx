"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

export function SiteHeader({ active }: { active: "inscribe" | "wall" }) {
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
            <path d="M1 7h22" opacity="0" />
            <path d="M16 11h4" />
            <path d="M3 3.5V3a2 2 0 0 1 2-2h13" opacity="0.7" />
          </svg>
          <WalletMultiButton>
            <span className="wallet-label">Connect Wallet</span>
          </WalletMultiButton>
        </span>
      </nav>
    </header>
  );
}
