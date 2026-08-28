import { SiteHeader } from "../components/SiteHeader";

export const metadata = { title: "Docs | Etched" };

export default function Docs() {
  return (
    <div className="page">
      <SiteHeader active="docs" />
      <section className="hero">
        <h1 className="hero-title docs-title">Docs</h1>
        <div className="tagline">
          <span className="ornament left" />
          <span className="tagline-text">How etching works</span>
          <span className="ornament right" />
        </div>
      </section>
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <span className="docs-side-label">Contents</span>
          <a href="#what" className="docs-side-link">
            What Etched is
          </a>
          <a href="#how" className="docs-side-link">
            How it works
          </a>
          <a href="#pricing" className="docs-side-link">
            Pricing
          </a>
          <a href="#permanence" className="docs-side-link">
            Permanence
          </a>
          <a href="#faq" className="docs-side-link">
            Questions
          </a>
        </aside>
        <main className="docs-body">
          <div className="slab docs-slab" id="what">
            <h2 className="docs-h">What Etched is</h2>
            <p>
              Etched inscribes your image directly into a Solana account. Not a
              link, not IPFS, not a URL that dies when someone stops paying a
              pinning service. The raw bytes of your jpeg live on chain,
              replicated by every Solana validator, for as long as Solana
              exists.
            </p>
            <p>
              You get an NFT that owns the inscription. The picture is not
              attached to the token, the picture is the account the token
              points at.
            </p>
          </div>
          <div className="slab docs-slab" id="how">
            <h2 className="docs-h">How it works</h2>
            <ol className="docs-list">
              <li>Connect your wallet and drop an image (jpg or png).</li>
              <li>
                Your image is compressed in your browser to fit under the 200kb
                hard cap. Nothing is uploaded to any server.
              </li>
              <li>
                You get a quote: on-chain rent for the exact byte size, plus a
                service fee.
              </li>
              <li>
                On approve, an NFT mint is created, an inscription account is
                initialized and allocated, and your image is written on chain
                in 850-byte chunks. You sign once, then the chunks stream with
                a progress bar.
              </li>
              <li>Done. Your piece appears on The Wall.</li>
            </ol>
          </div>
          <div className="slab docs-slab" id="pricing">
            <h2 className="docs-h">Pricing</h2>
            <p>
              Pricing is dynamic. You pay the actual Solana rent for the
              account that stores your bytes (bigger image, more rent), plus a
              flat service fee tier:
            </p>
            <ul className="docs-list">
              <li>up to 25kb: 0.05 SOL service fee</li>
              <li>up to 50kb: 0.09 SOL</li>
              <li>up to 100kb: 0.15 SOL</li>
              <li>up to 200kb (hard cap): 0.25 SOL</li>
            </ul>
            <p>
              The exact total is shown before you sign anything. No hidden
              costs.
            </p>
          </div>
          <div className="slab docs-slab" id="permanence">
            <h2 className="docs-h">Permanence</h2>
            <p>
              Rent-exempt Solana accounts persist indefinitely. Once written,
              your inscription cannot be taken down by us or anyone else. The
              Wall reads inscriptions straight from the chain, so even if this
              site vanished, your bytes would not.
            </p>
          </div>
          <div className="slab docs-slab" id="faq">
            <h2 className="docs-h">Questions</h2>
            <p className="docs-q">Can I inscribe anything other than images?</p>
            <p>Right now jpg and png only.</p>
            <p className="docs-q">Who holds the inscription?</p>
            <p>
              You do. The NFT mint lands in your wallet, the inscription
              account is tied to it.
            </p>
            <p className="docs-q">
              What happens if the transaction fails midway?
            </p>
            <p>
              Writes are chunked; if a chunk fails you can retry from where it
              stopped. Rent already paid stays with the account.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
