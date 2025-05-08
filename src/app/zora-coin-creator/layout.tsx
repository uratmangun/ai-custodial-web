import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import { Web3Provider } from "@/app/providers";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zora Coin Creator",
  description: "Zora Coin Creator",
  other: {
    "fc:frame": JSON.stringify({
      "version": "next",
      "imageUrl": `${process.env.NEXT_PUBLIC_DOMAIN}/zora_coin_banner.png`,
      "button": {
        "title": "Create coin",
        "action": {
          "type": "launch_frame",
          "name": "Create",
          "url": `${process.env.NEXT_PUBLIC_DOMAIN}/zora-coin-creator`,
          "splashImageUrl": `${process.env.NEXT_PUBLIC_DOMAIN}/zora_coin.png`,
          "splashBackgroundColor": "#f5f0ec"
        }
      }
    })
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Web3Provider>
          <Toaster 
            closeButton={true}
            richColors={true}
            duration={5000}
            position="top-right"
          />
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
