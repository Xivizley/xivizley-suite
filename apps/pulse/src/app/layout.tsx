import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'XIVIZLEY Pulse — Gerçek Zamanlı Sunucu ve Konteyner Nabız Monitörü',
  description: 'Uptime Kuma katili yerli sunucu, port ve HTTP izleme istasyonu. %99.99 Uptime ve anlık Telegram alarmları.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen bg-[#181e24] text-slate-100 antialiased selection:bg-[#0082c9]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
