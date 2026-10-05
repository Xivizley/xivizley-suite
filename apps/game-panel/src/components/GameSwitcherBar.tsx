"use client";

import { useGameStore } from "@/store/cockpit-store";
import { GAME_LIST } from "@/data/game-catalog";
import type { GameId } from "@xivizley/types";

export function GameSwitcherBar() {
  const { activeGameId, setActiveGame, activeServer, configPerGame } =
    useGameStore();

  return (
    <div className="w-full bg-[#222933] border-b border-[#2d3748] py-2.5 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto pb-1">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 pl-1 mr-2">
            Oyun Menüsü:
          </span>
        </div>

        <div className="flex items-center gap-2 flex-nowrap">
          {GAME_LIST.map((game) => {
            const isActive = activeGameId === game.id;
            const config =
              configPerGame[game.id as GameId] || game.defaultConfig;
            const isServerRunning =
              activeServer?.gameId === game.id &&
              (activeServer.status === "running" ||
                activeServer.status === "starting");

            return (
              <button
                key={game.id}
                type="button"
                onClick={() => setActiveGame(game.id as GameId)}
                className={`relative group flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer select-none ${
                  isActive
                    ? "bg-[#0082c9] text-white shadow-sm font-semibold"
                    : "bg-[#181e24] text-slate-300 hover:text-white hover:bg-[#2b3442] border border-[#2d3748]"
                }`}
              >
                <span className="text-base">{game.icon}</span>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span>{game.name}</span>
                    {/* Oyun Rozeti */}
                    {game.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase tracking-wider font-bold ${
                          isActive
                            ? "bg-white text-[#0082c9]"
                            : "bg-white/10 text-white/70 group-hover:bg-white/20"
                        }`}
                      >
                        {game.badge}
                      </span>
                    )}
                  </div>
                  {/* Seçili Sürüm Bilgisi */}
                  <span
                    className={`text-[10px] font-mono leading-none mt-0.5 ${isActive ? "text-white/80 font-medium" : "text-slate-400"}`}
                  >
                    v{config?.version || "latest"}
                  </span>
                </div>

                {/* Canlı Çalışan Konteyner Göstergesi */}
                {isServerRunning && (
                  <span
                    className="flex h-2 w-2 ml-1"
                    title="Sunucu şu an aktif çalışıyor"
                  >
                    <span className="inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
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
