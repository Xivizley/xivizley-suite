"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { NextcloudHeader } from "@xivizley/aurora-ui";
import { Terminal as TerminalIcon, Network } from "lucide-react";
import { NetworkTopologyMap } from "@/components/NetworkTopologyMap";

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
  const [activeTab, setActiveTab] = useState<"terminal" | "topology">("terminal");

  return (
    <div className="min-h-screen bg-[#181e24] text-slate-100 flex flex-col font-sans">
      <NextcloudHeader
        activeApp="terminal"
        title="Terminal"
        rightActions={
          <div className="flex items-center gap-1.5 bg-[#222933] p-1 rounded-lg border border-[#2d3748] text-xs">
            <button
              onClick={() => setActiveTab("terminal")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === "terminal"
                  ? "bg-[#0082c9] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Konsol</span>
            </button>
            <button
              onClick={() => setActiveTab("topology")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === "topology"
                  ? "bg-[#0082c9] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Ağ Topolojisi</span>
            </button>
          </div>
        }
      />
      <main className="flex-1 p-2 sm:p-4 max-w-7xl w-full mx-auto space-y-4">
        {activeTab === "terminal" ? <WebTerminalClient /> : <NetworkTopologyMap />}
      </main>
    </div>
  );
}
