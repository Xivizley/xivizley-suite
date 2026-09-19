import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Giriş Yap — XIVIZLEY ID",
  description: "XIVIZLEY Native Suite Merkezi Kimlik Doğrulama Servisi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-aurora-bg-dark text-aurora-text-primary min-h-screen antialiased flex flex-col justify-between">
        {children}
      </body>
    </html>
  );
}
