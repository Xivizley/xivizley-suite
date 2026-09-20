"use client";

import { useGameStore } from "@/store/cockpit-store";
import { GAME_LIST } from "@/data/game-catalog";
import type { GameId } from "@xivizley/types";

export function GameSwitcherBar() {
  const { activeGameId, setActiveGame, activeServer } = useGameStore();

  return (
    <div className="w-full bg-aurora-bg-dark/80 backdrop-blur-md border-b border-aurora-border-light/20 py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-aurora-border-light/30">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-aurora-text-muted/60 pl-1 mr-2">
            Oyun Seçin:
          </span>
        </div>

        <div className="flex items-center gap-2 flex-nowrap">
          {GAME_LIST.map((game) => {
            const isActive = activeGameId === game.id;
            const isServerRunning =
              activeServer?.gameId === game.id &&
              (activeServer.status === "running" || activeServer.status === "starting");

            return (
              <button
                key={game.id}
                type="button"
                onClick={() => setActiveGame(game.id as GameId)}
                className={`relative group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer select-none ${
                  isActive
                    ? "bg-aurora-cyan/15 text-aurora-cyan border border-aurora-cyan/50 shadow-[0_0_15px_rgba(0,242,254,0.25)] font-semibold"
                    : "bg-aurora-bg-card/60 text-aurora-text-muted hover:text-white hover:bg-aurora-bg-card border border-aurora-border-light/20 hover:border-aurora-border-light/50"
                }`}
              >
                <span className="text-base">{game.icon}</span>
                <span>{game.name}</span>

                {/* Oyun Rozeti */}
                {game.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                      isActive
                        ? "bg-aurora-cyan text-aurora-bg-dark"
                        : "bg-white/10 text-white/70 group-hover:bg-white/20"
                    }`}
                  >
                    {game.badge}
                  </span>
                )}

                {/* Canlı Çalışan Konteyner Göstergesi (Yeşil Nabız) */}
                {isServerRunning && (
                  <span className="relative flex h-2 w-2 ml-1" title="Sunucu şu an aktif çalışıyor">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
