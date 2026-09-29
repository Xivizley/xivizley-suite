"use client";

import { StoreHydration } from "@/store/StoreHydration";
import { GameSwitcherBar } from "@/components/GameSwitcherBar";
import { GameConfigurator } from "@/components/GameConfigurator";
import { LiveCockpitRight } from "@/components/LiveCockpitRight";
import { NextcloudHeader } from "@xivizley/aurora-ui";

export default function GameCockpitPage() {
  return (
    <StoreHydration>
      <div className="min-h-screen bg-[#181e24] text-slate-100 flex flex-col selection:bg-[#0082c9]/30 selection:text-white font-sans">
        {/* ─── Signature Nextcloud Header Bar ─────────────────── */}
        <NextcloudHeader
          activeApp="game"
          title="Oyun Sunucuları"
          rightActions={
            <div className="flex items-center gap-2">
              <span className="text-white flex items-center gap-1.5 text-xs font-medium bg-white/10 px-2.5 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                VDS Motoru Aktif
              </span>
            </div>
          }
        />

        {/* 9 Oyun Yatay Seçim Barı (Tek Sekme Geçişi) */}
        <GameSwitcherBar />

        {/* Ana Kokpit Grid Alanı (Sol: Yapılandırma, Sağ: Canlı Durum & Konsol) */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* SOL PANEL: Motor, Versiyon, Modpaketleri ve Eklentiler (5 Kolon) */}
            <div className="lg:col-span-5 w-full">
              <GameConfigurator />
            </div>

            {/* SAĞ PANEL: Canlı Durum, Dual Göstergeler, xterm ve Komut Satırı (7 Kolon) */}
            <div className="lg:col-span-7 w-full">
              <LiveCockpitRight />
            </div>
          </div>
        </main>
      </div>
    </StoreHydration>
  );
}
