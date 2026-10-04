"use client";

import React from "react";
import dynamic from "next/dynamic";
import { NextcloudHeader } from "@xivizley/aurora-ui";

const WebTerminalClient = dynamic(
  () => import("@/components/WebTerminalClient").then((mod) => mod.WebTerminalClient),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-7xl mx-auto p-12 text-center text-xs text-slate-400 font-mono">
        <div className="w-6 h-6 border-2 border-[#0082c9] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Terminal altyapısı yükleniyor...
      </div>
    ),
  }
);

export default function TerminalPage() {
  return (
    <div className="min-h-screen bg-[#181e24] text-slate-100 flex flex-col font-sans">
      <NextcloudHeader activeApp="terminal" title="Terminal" />
      <main className="flex-1 p-2 sm:p-4">
        <WebTerminalClient />
      </main>
    </div>
  );
}
