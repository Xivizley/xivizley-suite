"use client";

import { useState, useEffect } from "react";
import { StoreHydration } from "@/store/StoreHydration";
import { useGameStore } from "@/store/cockpit-store";
import { GAME_CATALOG } from "@/data/game-catalog";
import type { GameId } from "@xivizley/types";
import { GameSwitcherBar } from "@/components/GameSwitcherBar";
import { MCServerHero } from "@/components/MCServerHero";
import { GameConfigurator } from "@/components/GameConfigurator";
import { LiveCockpitRight } from "@/components/LiveCockpitRight";
import { ServerFileManager } from "@/components/ServerFileManager";
import { ServerPlayerRoster } from "@/components/ServerPlayerRoster";
import { ServerBackupStudio } from "@/components/ServerBackupStudio";
import { ServerPluginManager } from "@/components/ServerPluginManager";
import { NextcloudHeader } from "@xivizley/aurora-ui";

type CockpitTab =
  "console" | "config" | "files" | "backups" | "plugins" | "players";

interface TabItem {
  id: CockpitTab;
  label: string;
  icon: string;
  badge?: string;
}

const TABS: TabItem[] = [
  {
    id: "console",
    label: "Canlı Konsol & Terminal",
    icon: "🖥️",
    badge: "xterm",
  },
  {
    id: "config",
    label: "Sunucu Ayarları & Motor",
    icon: "⚙️",
    badge: "12 Motor",
  },
  {
    id: "files",
    label: "Dosya Yöneticisi & Editör",
    icon: "📁",
    badge: "Pterodactyl",
  },
  { id: "backups", label: "Yedekler & Kurtarma", icon: "🗄️", badge: "tar.gz" },
  {
    id: "plugins",
    label: "Eklentiler & Modlar",
    icon: "🧩",
    badge: "Pazar Yeri",
  },
  { id: "players", label: "Canlı Oyuncular", icon: "👥", badge: "Moderasyon" },
];

export default function GameCockpitPage() {
  const [activeTab, setActiveTab] = useState<CockpitTab>("console");
  const {
    activeGameId,
    setActiveGame,
    isAdmin,
    authChecked,
    adminUser,
    checkAdminAuth,
  } = useGameStore();

  useEffect(() => {
    checkAdminAuth();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const gameParam = params.get("game");
      if (gameParam && gameParam in GAME_CATALOG) {
        setActiveGame(gameParam as GameId);
      } else if (!activeGameId || activeGameId === "fivem") {
        // Önceden localStorage'da fivem kalmışsa veya boşsa Minecraft'a geçir
        setActiveGame("minecraft");
      }
    }
  }, [activeGameId, setActiveGame, checkAdminAuth]);

  return (
    <StoreHydration>
      <div className="min-h-screen bg-[#090d14] text-slate-100 flex flex-col selection:bg-[#1AD76F]/30 selection:text-white font-sans">
        {/* ─── Signature Nextcloud Header Bar ─────────────────── */}
        <NextcloudHeader
          activeApp="game"
          title="Oyun Sunucuları"
          rightActions={
            <div className="flex items-center gap-2">
              {authChecked &&
                (isAdmin ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-1 rounded-lg">
                    <span>👑</span>
                    <span>Yönetici ({adminUser?.displayName || "Admin"})</span>
                  </span>
                ) : (
                  <a
                    href="/login?redirect_uri=/game"
                    className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 px-3 py-1 rounded-lg transition-colors"
                    title="Sunucuyu başlatmak, durdurmak veya ayarları değiştirmek için Yönetici Girişi yapın"
                  >
                    <span>🔐</span>
                    <span>Misafir Modu • Yönetici Girişi</span>
                  </a>
                ))}
              <span className="text-white flex items-center gap-1.5 text-xs font-semibold bg-[#1AD76F]/20 text-[#1AD76F] border border-[#1AD76F]/30 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-[#1AD76F] animate-pulse" />
                VDS Motoru Aktif
              </span>
            </div>
          }
        />

        {/* 9 Oyun Yatay Seçim Barı (Tek Sekme Geçişi) */}
        <GameSwitcherBar />

        {/* ─── mcserverhost Tarzı Server Hero Kartı (IP Kopyalama, Durum ve Donanım) ── */}
        <MCServerHero />

        {/* ─── mcserverhost Tarzı Alt Sekme Çubuğu ───────────────────── */}
        <nav className="bg-[#0b1018] border-b border-[#1a2536] px-4 sm:px-6 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#1AD76F] text-black shadow-[0_0_15px_rgba(26,215,111,0.25)] font-bold scale-[1.02]"
                      : "bg-[#111824] text-slate-300 hover:text-white hover:bg-[#182333] border border-[#1e2a3c]"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-opacity ${
                        isActive
                          ? "bg-black/20 text-black font-extrabold"
                          : "bg-white/10 text-slate-400"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Ana İçerik Alanı */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          {/* TAB 1: Canlı Konsol & Terminal (Tam Genişlik) */}
          {activeTab === "console" && (
            <div className="w-full">
              <LiveCockpitRight hideHeader />
            </div>
          )}

          {/* TAB 2: Sunucu Ayarları & Motor Seçimi */}
          {activeTab === "config" && (
            <div className="w-full">
              <GameConfigurator />
            </div>
          )}

          {/* TAB 3: Konteyner Dosya Yöneticisi & Kod Editörü */}
          {activeTab === "files" && (
            <div className="w-full">
              <ServerFileManager />
            </div>
          )}

          {/* TAB 4: Sunucu Yedekleri & Felaket Kurtarma */}
          {activeTab === "backups" && (
            <div className="w-full">
              <ServerBackupStudio />
            </div>
          )}

          {/* TAB 5: Eklentiler & Mod Pazar Yeri */}
          {activeTab === "plugins" && (
            <div className="w-full">
              <ServerPluginManager />
            </div>
          )}

          {/* TAB 6: Canlı Oyuncu Masası & Moderasyon */}
          {activeTab === "players" && (
            <div className="w-full">
              <ServerPlayerRoster />
            </div>
          )}
        </main>
      </div>
    </StoreHydration>
  );
}
