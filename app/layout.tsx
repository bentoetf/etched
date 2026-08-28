import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cinzel",
});

const cinzelDeco = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-cinzel-deco",
});

export const metadata: Metadata = {
  title: "Etched | Solana Meme Inscriptions",
  description: "Etch your memes on Solana forever. $ETCH.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${cinzelDeco.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
