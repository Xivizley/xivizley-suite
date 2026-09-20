"use client";

import { StoreHydration } from "@/store/StoreHydration";
import { GameSwitcherBar } from "@/components/GameSwitcherBar";
import { GameConfigurator } from "@/components/GameConfigurator";
import { LiveCockpitRight } from "@/components/LiveCockpitRight";

export default function GameCockpitPage() {
  return (
    <StoreHydration>
      <div className="min-h-screen bg-[#050709] text-white flex flex-col selection:bg-aurora-cyan/30 selection:text-white">
        {/* Üst Global Header */}
        <header className="border-b border-aurora-border-light/20 bg-aurora-bg-dark/90 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-aurora-cyan/15 border border-aurora-cyan/40 flex items-center justify-center text-aurora-cyan shadow-[0_0_12px_rgba(0,242,254,0.3)]">
                <span className="text-lg">🎮</span>
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  XIVIZLEY GAME COCKPIT <span className="text-xs text-aurora-cyan font-mono font-normal">v2</span>
                </h1>
                <p className="text-[11px] text-aurora-text-muted">
                  Hepsi-Bir-Arada Çoklu Oyun Orkestrasyonu • Canlı Tek Sekme
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-400 flex items-center gap-1.5 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                VDS Motoru Aktif
              </span>
              <a
                href="https://suite.xivizley.com.tr"
                className="text-aurora-text-muted hover:text-white transition-colors text-xs hidden sm:inline"
              >
                ← Suite Paneli
              </a>
            </div>
          </div>
        </header>

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
