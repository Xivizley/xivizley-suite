import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'XIVIZLEY Shield — Siber Tehdit Radarı & WAF Savunma Kokpiti',
  description: 'Self-hosted Intrusion Prevention, Heuristic WAF, and Threat Intelligence Cockpit by XIVIZLEY.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-[#07090e] text-slate-100 min-h-screen selection:bg-rose-500/30 selection:text-rose-200">
        {children}
      </body>
    </html>
  );
}
