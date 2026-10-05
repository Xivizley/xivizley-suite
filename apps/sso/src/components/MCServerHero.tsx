"use client";

import { useState, useEffect } from "react";
import { useGameStore, getContainerMemoryLimitMb } from "@/store/cockpit-store";
import { GAME_CATALOG } from "@/data/game-catalog";
import type { HostMetrics, ContainerMetrics, GameId } from "@xivizley/types";
import type { ServerStatus } from "@xivizley/aurora-ui";

interface StreamData {
  container: ContainerMetrics & { status: ServerStatus };
  host: HostMetrics;
}

export function MCServerHero() {
  const {
    activeGameId,
    configPerGame,
    activeServer,
    setActiveServer,
    getEstimatedRam,
    canStartActiveGame,
    isAdmin,
    authChecked,
  } = useGameStore();

  const game = GAME_CATALOG[activeGameId] || GAME_CATALOG.minecraft;
  const config = configPerGame[activeGameId] || game.defaultConfig;
  const currentEngine =
    game.engines.find((e) => e.id === config.engineId) || game.engines[0];

  const [metrics, setMetrics] = useState<StreamData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // SSE Metrik Akışı
  useEffect(() => {
    const sse = new EventSource(
      `/api/metrics/stream?gameId=${encodeURIComponent(activeGameId)}`,
    );

    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as StreamData;
        setMetrics(data);

        if (data.container) {
          setActiveServer({
            containerId: data.container.containerId,
            gameId: activeGameId,
            status: data.container.status,
          });
        }
      } catch {
        // sessizce geç
      }
    };

    return () => {
      sse.close();
    };
  }, [activeGameId, setActiveServer]);

  const estimatedRam = getEstimatedRam(activeGameId);
  const containerMemLimit = getContainerMemoryLimitMb(estimatedRam);
  const currentStatus: ServerStatus = metrics?.container?.status || "stopped";
  const isRunning = currentStatus === "running";
  const startEligibility = canStartActiveGame();

  const handleServerAction = async (action: "start" | "stop" | "restart") => {
    if (!isAdmin) {
      window.location.href = "/login?redirect_uri=/game";
      return;
    }
    setActionLoading(action);
    setActionError(null);

    try {
      const res = await fetch(`/api/server/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: activeGameId }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setActionError(json.message || `İşlem başarısız (${res.status})`);
      } else {
        if (action === "start") {
          setActiveServer({
            containerId:
              json.data?.container || `xivizley-${activeGameId}-server`,
            gameId: activeGameId,
            status: "starting",
          });
        } else if (action === "stop") {
          setActiveServer(null);
        }
      }
    } catch (err: any) {
      setActionError(err.message || "Sunucuyla iletişim kurulamadı.");
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const handleReset = async () => {
    if (!isAdmin) {
      window.location.href = "/login?redirect_uri=/game";
      return;
    }
    setResetConfirm(false);
    setResetLoading(true);
    setResetResult(null);
    try {
      const res = await fetch("/api/server/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: activeGameId }),
      });
      const json = await res.json();
      if (json.ok) {
        setActiveServer(null);
        setResetResult({
          ok: true,
          message: json.data?.message || "Sunucu sıfırlandı.",
        });
      } else {
        setResetResult({
          ok: false,
          message: json.message || "Sıfırlama başarısız.",
        });
      }
    } catch (err: any) {
      setResetResult({
        ok: false,
        message: err.message || "Sunucuyla iletişim kurulamadı.",
      });
    } finally {
      setResetLoading(false);
      setTimeout(() => setResetResult(null), 8000);
    }
  };

  const serverPort = config.port || game.defaultPort;
  const detectedHost =
    typeof window !== "undefined"
      ? window.location.hostname
      : metrics?.host?.serverIp || "localhost";
  const serverIpAddress = `${detectedHost}:${serverPort}`;

  const copyIp = () => {
    navigator.clipboard.writeText(serverIpAddress);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2500);
  };

  // RAM Hesaplama
  const usedRamMb = metrics?.container?.memUsageMb || 0;
  const ramPercent = Math.min(
    100,
    Math.round((usedRamMb / containerMemLimit) * 100),
  );

  // CPU Hesaplama
  const cpuPercent = metrics?.container?.cpuPercent || 0;
  const cpuModel = metrics?.host?.cpuModel || "Çok Çekirdekli İşlemci";
  const totalCores = metrics?.host?.totalCpuCores || 2;
  const hostTotalRamGb = metrics?.host?.totalRamMb
    ? (metrics.host.totalRamMb / 1024).toFixed(1)
    : null;
  const hostTotalDiskGb = metrics?.host?.totalDiskGb || 40;
  const hostUsedDiskGb = metrics?.host?.usedDiskGb || 0;
  const hostDiskPercent = metrics?.host?.diskUsagePercent ?? 12;

  return (
    <div className="w-full bg-[#0d141e] border-b border-[#1c2838] p-4 sm:p-6 text-slate-100">
      <div className="max-w-7xl mx-auto flex flex-col gap-5">
        {/* ÜST BÖLÜM: Sunucu Bilgileri, IP Kopyalama ve Aksiyon Butonları */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Sol: Sunucu İkonu, İsim, IP ve Rozetler */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#162232] to-[#0d1520] border-2 border-[#1c2c40] flex items-center justify-center text-3xl shadow-lg shadow-black/40">
                {game.icon}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0d141e] ${
                  isRunning
                    ? "bg-[#1AD76F] shadow-[0_0_12px_#1AD76F]"
                    : "bg-slate-500"
                }`}
                title={isRunning ? "Sunucu Çevrimiçi" : "Sunucu Çevrimdışı"}
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  {game.name} Dedicated
                </h1>

                {/* mcserverhost tarzı Çevrimiçi Rozeti */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase font-mono ${
                    isRunning
                      ? "bg-[#1AD76F]/15 text-[#1AD76F] border border-[#1AD76F]/30 shadow-[0_0_10px_rgba(26,215,111,0.2)]"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isRunning ? "bg-[#1AD76F] animate-pulse" : "bg-slate-500"
                    }`}
                  />
                  {isRunning ? "ÇEVRİMİÇİ • 20.0 TPS" : "DURDURULDU"}
                </span>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#162232] text-emerald-400 border border-emerald-500/20 font-bold">
                  {currentEngine?.name.split(" ")[0]} v
                  {config.version || "LATEST"}
                </span>
              </div>

              {/* mcserverhost tarzı 1-Tıkla Kopyalanabilir IP Çubuğu */}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={copyIp}
                  className="group flex items-center gap-2 px-3 py-1 rounded-lg bg-[#141e2b] hover:bg-[#1a283a] border border-[#223348] hover:border-[#1AD76F]/50 transition-all cursor-pointer text-xs font-mono text-slate-200"
                  title="IP Adresini Kopyala"
                >
                  <span className="text-[#1AD76F] text-xs">🌐</span>
                  <span className="text-white font-semibold">
                    {serverIpAddress}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded transition-all font-sans font-medium ${
                      copiedIp
                        ? "bg-[#1AD76F] text-black font-bold"
                        : "bg-[#1c293a] text-slate-400 group-hover:text-white"
                    }`}
                  >
                    {copiedIp ? "✓ Kopyalandı!" : "Kopyala"}
                  </span>
                </button>

                <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
                  <span
                    className="px-2 py-0.5 rounded bg-[#131b26] border border-[#1e2a3a] text-slate-300 font-mono max-w-[220px] truncate"
                    title={cpuModel}
                  >
                    ⚡ {cpuModel}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#131b26] border border-[#1e2a3a] text-slate-300">
                    🛡️ Anti-DDoS Shield
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sağ: mcserverhost Büyük Aksiyon Butonları */}
          <div className="flex flex-wrap items-center gap-2.5">
            {actionError && (
              <span className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg max-w-xs">
                ⚠️ {actionError}
              </span>
            )}

            {!startEligibility.allowed && !isRunning && (
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg max-w-xs">
                {startEligibility.reason}
              </span>
            )}

            {authChecked && !isAdmin && (
              <a
                href="/login?redirect_uri=/game"
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <span>🔒</span>
                <span>Yönetim İçin Giriş Yap</span>
              </a>
            )}

            {/* BAŞLAT BUTONU (mcserverhost Yeşil Vurgulu) */}
            <button
              type="button"
              disabled={
                !isAdmin ||
                isRunning ||
                !startEligibility.allowed ||
                !!actionLoading
              }
              onClick={() => handleServerAction("start")}
              title={
                !isAdmin
                  ? "Bu işlem yalnızca sunucu yöneticisi tarafından yapılabilir"
                  : undefined
              }
              className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                !isAdmin || isRunning || !startEligibility.allowed
                  ? "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed"
                  : "bg-[#1AD76F] text-black hover:bg-[#18c465] hover:scale-[1.02] shadow-[0_0_20px_rgba(26,215,111,0.35)] active:scale-95"
              }`}
            >
              <span>{!isAdmin ? "🔒" : "▶"}</span>
              <span>
                {actionLoading === "start" ? "Başlatılıyor..." : "Başlat"}
              </span>
            </button>

            {/* YENİDEN BAŞLAT */}
            <button
              type="button"
              disabled={!isAdmin || !isRunning || !!actionLoading}
              onClick={() => handleServerAction("restart")}
              title={
                !isAdmin
                  ? "Bu işlem yalnızca sunucu yöneticisi tarafından yapılabilir"
                  : undefined
              }
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                !isAdmin || !isRunning
                  ? "bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed"
                  : "bg-[#182333] hover:bg-[#202e42] text-white border border-[#273850] hover:border-[#1AD76F]/50 active:scale-95"
              }`}
            >
              <span>{!isAdmin ? "🔒" : "🔄"}</span>
              <span>
                {actionLoading === "restart"
                  ? "Yenileniyor..."
                  : "Yeniden Başlat"}
              </span>
            </button>

            {/* DURDUR */}
            <button
              type="button"
              disabled={!isAdmin || !isRunning || !!actionLoading}
              onClick={() => handleServerAction("stop")}
              title={
                !isAdmin
                  ? "Bu işlem yalnızca sunucu yöneticisi tarafından yapılabilir"
                  : undefined
              }
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                !isAdmin || !isRunning
                  ? "bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed"
                  : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 active:scale-95"
              }`}
            >
              <span>{!isAdmin ? "🔒" : "⏹"}</span>
              <span>
                {actionLoading === "stop" ? "Durduruluyor..." : "Durdur"}
              </span>
            </button>

            {/* SUNUCUYU SIFIRLA */}
            <button
              type="button"
              disabled={!isAdmin || !!actionLoading || resetLoading}
              onClick={() => setResetConfirm(true)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                !isAdmin
                  ? "bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed"
                  : resetLoading
                    ? "bg-orange-500/10 text-orange-400/50 border border-orange-500/20 cursor-not-allowed animate-pulse"
                    : "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:border-orange-500/60 active:scale-95"
              }`}
              title={
                !isAdmin
                  ? "Bu işlem yalnızca sunucu yöneticisi tarafından yapılabilir"
                  : "Sunucuyu tamamen sıfırla — tüm dünya ve eklenti verileri silinir"
              }
            >
              <span>{!isAdmin ? "🔒" : "🗑️"}</span>
              <span>{resetLoading ? "Sıfırlanıyor..." : "Sıfırla"}</span>
            </button>
          </div>
        </div>

        {/* SIFIRLAMA SONUÇ BANNER */}
        {resetResult && (
          <div
            className={`text-xs px-4 py-2.5 rounded-xl border flex items-center gap-2 ${
              resetResult.ok
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <span>{resetResult.ok ? "✅" : "❌"}</span>
            <span>{resetResult.message}</span>
          </div>
        )}

        {/* SIFIRLAMA ONAY MODALI */}
        {resetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0d141e] border border-orange-500/40 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-black/60">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h2 className="text-white font-black text-base">
                    Sunucuyu Sıfırla
                  </h2>
                  <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mt-0.5">
                    Geri Alınamaz İşlem
                  </p>
                </div>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3.5 mb-5 text-xs text-orange-200 leading-relaxed space-y-1.5">
                <p>
                  🗺️ <strong>Tüm dünya haritası</strong> ve bloklar silinir.
                </p>
                <p>
                  🧩 <strong>Tüm eklenti verileri</strong> (economy, claims,
                  ranks) silinir.
                </p>
                <p>
                  👤 <strong>Oyuncu envanterleri ve ilerlemesi</strong> silinir.
                </p>
                <p>⚙️ Sunucu varsayılan ayarlarıyla sıfırdan başlar.</p>
              </div>
              <p className="text-slate-400 text-xs mb-5">
                <strong className="text-white">{game.name}</strong> sunucusunu
                tamamen sıfırlamak istediğinden emin misin?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setResetConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1a2436] hover:bg-[#202e42] text-slate-300 text-xs font-bold border border-[#2d3e56] transition-all cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-orange-500/30 active:scale-95"
                >
                  🗑️ Evet, Sıfırla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ALT BÖLÜM: mcserverhost Tarzı 4 Donanım & Kaynak Metrik Kartı */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {/* 1. RAM KARTI */}
          <div className="p-3.5 rounded-xl bg-[#121a26] border border-[#1d2a3c] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <span>🧠</span> Sunucu Belleği (RAM)
              </span>
              <span className="font-mono text-[#1AD76F] font-bold">
                %{ramPercent}
              </span>
            </div>
            <div className="w-full bg-[#0a0f16] h-2 rounded-full overflow-hidden border border-[#1b2636]">
              <div
                className="bg-gradient-to-r from-[#10b981] to-[#1AD76F] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(26,215,111,0.5)]"
                style={{ width: `${ramPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>{usedRamMb} MB Konteyner</span>
              <span>
                {hostTotalRamGb
                  ? `${hostTotalRamGb} GB Host`
                  : `${containerMemLimit} MB Max`}
              </span>
            </div>
          </div>

          {/* 2. CPU KARTI */}
          <div className="p-3.5 rounded-xl bg-[#121a26] border border-[#1d2a3c] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span
                className="font-semibold text-slate-300 flex items-center gap-1.5 truncate max-w-[150px]"
                title={cpuModel}
              >
                <span>⚡</span> {cpuModel}
              </span>
              <span className="font-mono text-cyan-400 font-bold">
                %{cpuPercent}
              </span>
            </div>
            <div className="w-full bg-[#0a0f16] h-2 rounded-full overflow-hidden border border-[#1b2636]">
              <div
                className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                style={{ width: `${Math.min(100, cpuPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Dedike İşlemci</span>
              <span>{totalCores} Çekirdek / vCPU</span>
            </div>
          </div>

          {/* 3. DİSK / SSD KARTI */}
          <div className="p-3.5 rounded-xl bg-[#121a26] border border-[#1d2a3c] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <span>💽</span> Disk / SSD Hacmi
              </span>
              <span className="font-mono text-purple-400 font-bold">
                %{hostDiskPercent}
              </span>
            </div>
            <div className="w-full bg-[#0a0f16] h-2 rounded-full overflow-hidden border border-[#1b2636]">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                style={{ width: `${Math.min(100, hostDiskPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="truncate max-w-[110px]" title={game.volumeName}>
                {game.volumeName}
              </span>
              <span>
                {hostTotalDiskGb} GB ({hostUsedDiskGb} GB Dolu)
              </span>
            </div>
          </div>

          {/* 4. OYUNCU DURUMU KARTI */}
          <div className="p-3.5 rounded-xl bg-[#121a26] border border-[#1d2a3c] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <span>👥</span> Sunucu Kapasitesi
              </span>
              <span className="font-mono text-[#1AD76F] font-bold">
                {isRunning ? "30 Slot" : "0 Slot"}
              </span>
            </div>
            <div className="w-full bg-[#0a0f16] h-2 rounded-full overflow-hidden border border-[#1b2636]">
              <div
                className="bg-[#1AD76F] h-full rounded-full transition-all duration-500"
                style={{ width: isRunning ? "10%" : "0%" }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>{isRunning ? "Port Aktif (25565)" : "Çevrimdışı"}</span>
              <span className="text-[#1AD76F] font-semibold">
                DDoS Korumalı
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
