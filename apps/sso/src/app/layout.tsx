import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@xivizley/aurora-ui";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import "../styles/globals.css";

export const viewport: Viewport = {
  themeColor: "#0082c9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "XIVIZLEY Hub — Merkezi Kimlik & Homelab Bulut Portalı",
  description: "XIVIZLEY Native Suite Merkezi Kimlik Doğrulama ve Homelab Bulut Servisi",
  manifest: "/manifest.json",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "XIVIZLEY Hub",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-[#181e24] text-slate-100 min-h-screen selection:bg-[#0082c9]/30 selection:text-white antialiased flex flex-col justify-between">
        <ToastProvider>
          {children}
          <PwaInstallPrompt />
        </ToastProvider>
      </body>
    </html>
  );
}
