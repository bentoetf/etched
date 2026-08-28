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
        <WalletMultiButton />
      </nav>
    </header>
  );
}
