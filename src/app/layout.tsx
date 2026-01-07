import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hertz",
  description: "Connect through music",
  icons: {
    icon: "/app_icon.png",
    shortcut: "/app_icon.png",
    apple: "/app_icon.png",
  },
};

import { PlayerProvider } from "@/components/player/PlayerContext";
import { FooterPlayer } from "@/components/player/FooterPlayer";
import { SidebarShell } from "@/components/SidebarShell";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased bg-[#E8E4D9]`}
      >
        <PlayerProvider>
          <SidebarShell>
            <div className="pb-28">
              {children}
            </div>
          </SidebarShell>
          <FooterPlayer />
        </PlayerProvider>
        <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID}`} crossOrigin="anonymous"></script>
      </body>
    </html>
  );
}
