import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import { StarBackground } from "./components/StarBackground";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Zeteo - Airdrop Tracker",
  description: "Track and claim your crypto airdrops",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-black text-white overflow-x-hidden">
        <Providers>
          <StarBackground />
          <Navbar />
          <main className="overflow-x-hidden">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
