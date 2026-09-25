import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'XIVIZLEY Pass — Güvenli Sıfır Bilgili Şifre & 2FA Kasası',
  description: 'Self-hosted Zero-Knowledge Password, Secret and 2FA Authenticator Manager by XIVIZLEY.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-[#07090e] text-slate-100 min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
