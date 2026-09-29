import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';

export const viewport: Viewport = {
  themeColor: "#0082c9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'XIVIZLEY Pass — Güvenli Sıfır Bilgili Şifre & 2FA Kasası',
  description: 'Self-hosted Zero-Knowledge Password, Secret and 2FA Authenticator Manager by XIVIZLEY.',
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "XIVIZLEY Pass",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-[#181e24] text-slate-100 min-h-screen selection:bg-[#0082c9]/30 selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
