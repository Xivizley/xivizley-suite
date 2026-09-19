import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "XIVIZLEY Drive — Hızlı & Güvenli Bulut Depolama",
  description: "XIVIZLEY Native Suite Yerli Bulut Depolama ve Dosya Paylaşım Merkezi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-aurora-bg-dark text-aurora-text-primary min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
