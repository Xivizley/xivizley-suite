"use client";

import { useGameStore } from "@/store/cockpit-store";
import { GAME_LIST } from "@/data/game-catalog";
import type { GameId } from "@xivizley/types";

export function GameSwitcherBar() {
  const { activeGameId, setActiveGame, activeServer, configPerGame } =
    useGameStore();

  return (
    <div className="w-full bg-[#0b1018] border-b border-[#1a2536] py-2 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1AD76F] pl-1 mr-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1AD76F] animate-pulse" />
            Sunucular:
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
                className={`relative group flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer select-none ${
                  isActive
                    ? "bg-[#1AD76F] text-black shadow-[0_0_15px_rgba(26,215,111,0.3)] font-bold scale-[1.02]"
                    : "bg-[#111824] text-slate-300 hover:text-white hover:bg-[#182333] border border-[#1d2a3c]"
                }`}
              >
                <span className="text-base">{game.icon}</span>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span>{game.name}</span>
                    {game.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase tracking-wider font-bold ${
                          isActive
                            ? "bg-black/20 text-black font-extrabold"
                            : "bg-white/10 text-white/70 group-hover:bg-white/20"
                        }`}
                      >
                        {game.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-mono leading-none mt-0.5 ${isActive ? "text-black/80 font-bold" : "text-slate-400"}`}
                  >
                    v{config?.version || "latest"}
                  </span>
                </div>

                {isServerRunning && (
                  <span
                    className="flex h-2 w-2 ml-1"
                    title="Sunucu şu an aktif çalışıyor"
                  >
                    <span className="inline-flex rounded-full h-2 w-2 bg-[#1AD76F] shadow-[0_0_6px_#1AD76F]"></span>
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
