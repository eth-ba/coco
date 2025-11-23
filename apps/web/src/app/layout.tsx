import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { Providers } from "./providers";

const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Coco - High-Yield Stablecoin Savings",
  description: "The simplest way to earn high yields on your stablecoins across any chain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${schibstedGrotesk.variable} antialiased font-sans`}
      >
        <Providers>
        {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
