import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "XIVIZLEY Shield — Siber Tehdit Radarı & WAF Savunma Kokpiti",
  description:
    "Self-hosted Intrusion Prevention, Heuristic WAF, and Threat Intelligence Cockpit by XIVIZLEY.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-[#181e24] text-slate-100 min-h-screen selection:bg-[#0082c9]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
