"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Gamepad2,
  Server,
  ArrowRight,
  RefreshCw,
  Play,
  Users,
  Cpu,
  PowerOff,
  CheckCircle2,
} from "lucide-react";

interface GameStatus {
  gameId: string;
  gameName: string;
  containerName: string;
  status: "running" | "offline" | "starting";
  isOnline: boolean;
  port: number;
  players: number;
  maxPlayers: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  uptime: string;
  message?: string;
}

export function GameCockpitWidget() {
  const [status, setStatus] = useState<GameStatus | null>(null);
  const [selectedGame, setSelectedGame] = useState<"fivem" | "minecraft">(
    "fivem",
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchGameStatus = async (gameId: "fivem" | "minecraft") => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    try {
      setIsLoading(true);
      const res = await fetch(`/api/server/summary?gameId=${gameId}`, {
        signal: controller.signal,
        credentials: "include",
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          setStatus(json.data);
          return;
        }
      }
      // Fallback offline
      setStatus({
        gameId,
        gameName: gameId === "fivem" ? "FiveM Roleplay" : "Minecraft PaperMC",
        containerName: `${gameId}-server`,
        status: "offline",
        isOnline: false,
        port: gameId === "fivem" ? 30120 : 25565,
        players: 0,
        maxPlayers: 32,
        memoryUsedMb: 0,
        memoryLimitMb: 2048,
        uptime: "Çevrimdışı",
        message: "Sunucu çevrimdışı",
      });
    } catch {
      setStatus({
        gameId,
        gameName: gameId === "fivem" ? "FiveM Roleplay" : "Minecraft PaperMC",
        containerName: `${gameId}-server`,
        status: "offline",
        isOnline: false,
        port: gameId === "fivem" ? 30120 : 25565,
        players: 0,
        maxPlayers: 32,
        memoryUsedMb: 0,
        memoryLimitMb: 2048,
        uptime: "Çevrimdışı",
        message: "Sunucu yanıt vermiyor",
      });
    } finally {
      setIsLoading(false);
      clearTimeout(timeout);
    }
  };

  useEffect(() => {
    fetchGameStatus(selectedGame);
  }, [selectedGame]);

  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#222933] p-5 flex flex-col justify-between space-y-4 shadow-sm">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                <span>Oyun Sunucusu Kokpiti</span>
                {status?.isOnline ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                )}
              </h3>
              <p className="text-[10px] text-slate-400">
                Canlı sunucu durumu ve oyuncu takibi
              </p>
            </div>
          </div>

          {/* Game Switcher Tabs */}
          <div className="flex items-center gap-1 bg-[#181e24] p-1 rounded-lg border border-[#2d3748]">
            <button
              type="button"
              onClick={() => setSelectedGame("fivem")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                selectedGame === "fivem"
                  ? "bg-[#0082c9] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              FiveM
            </button>
            <button
              type="button"
              onClick={() => setSelectedGame("minecraft")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                selectedGame === "minecraft"
                  ? "bg-[#0082c9] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Minecraft
            </button>
          </div>
        </div>

        {/* Status Card Body */}
        {isLoading && !status ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <div className="w-5 h-5 border-2 border-[#0082c9] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Sunucu durumu doğrulanıyor...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3.5 rounded-lg bg-[#181e24] border border-[#2d3748] flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-200">
                    {status?.gameName}
                  </span>
                  <span className="text-[10px] text-sky-400 font-mono">
                    :{status?.port}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {status?.isOnline ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{status.uptime}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1 font-mono">
                      <PowerOff className="w-3 h-3 text-rose-400" />
                      <span>Konteyner Çevrimdışı</span>
                    </span>
                  )}
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                    status?.isOnline
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${status?.isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`}
                  />
                  <span>{status?.isOnline ? "Çevrimiçi" : "Durduruldu"}</span>
                </span>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#181e24] border border-[#2d3748] flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-[#0082c9]" />
                <div>
                  <span className="text-[9px] text-slate-500 block">
                    OYUNCULAR
                  </span>
                  <span className="font-bold text-slate-200">
                    {status?.players ?? 0} / {status?.maxPlayers ?? 32}
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#181e24] border border-[#2d3748] flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <div>
                  <span className="text-[9px] text-slate-500 block">
                    RAM SINIRI
                  </span>
                  <span className="font-bold text-slate-200">
                    {status?.isOnline ? `${status.memoryUsedMb} MB` : "2048 MB"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="pt-2 border-t border-[#2d3748]/60 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500 font-mono">
          Docker v26 • RCON
        </span>
        <Link
          href={`/game?game=${selectedGame}`}
          className="inline-flex items-center gap-1 text-[#0082c9] hover:text-[#38bdf8] font-medium transition-colors"
        >
          <span>Kokpite Git</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
