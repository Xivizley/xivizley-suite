import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "XIVIZLEY Game Panel — FiveM Yönetimi",
  description: "XIVIZLEY Native Suite Yüksek Öncelikli Oyun Yönetim Paneli",
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
