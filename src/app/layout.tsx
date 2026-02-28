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
  manifest: "/manifest.json",
  icons: {
    icon: "/app_icon.png",
    shortcut: "/app_icon.png",
    apple: "/app_icon.png",
  },
};

export const viewport = {
  themeColor: "#E8E4D9",
};

import { PlayerProvider } from "@/components/player/PlayerContext";
import { FooterPlayer } from "@/components/player/FooterPlayer";
import { SidebarShell } from "@/components/SidebarShell";

import { NotificationsList } from "@/components/NotificationsList";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/app_icon.png" />
      </head>
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
          <NotificationsList />
        </PlayerProvider>
        <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID}`} crossOrigin="anonymous"></script>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
