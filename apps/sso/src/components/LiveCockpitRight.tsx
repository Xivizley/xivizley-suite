"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Button, MetricGauge, StatusBadge, type ServerStatus } from "@xivizley/aurora-ui";
import { useGameStore, checkRamSafety, getContainerMemoryLimitMb } from "@/store/cockpit-store";
import { GAME_CATALOG } from "@/data/game-catalog";
import type { HostMetrics, ContainerMetrics } from "@xivizley/types";

const TerminalLogViewer = dynamic(
  () => import("@/components/TerminalLogViewer").then((mod) => mod.TerminalLogViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 rounded-xl bg-[#222933] border border-[#2d3748] flex items-center justify-center">
        <span className="text-xs text-slate-400 font-mono">Terminal yükleniyor...</span>
      </div>
    ),
  }
);

interface StreamData {
  container: ContainerMetrics & { status: ServerStatus };
  host: HostMetrics;
}

export function LiveCockpitRight({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const {
    activeGameId,
    configPerGame,
    activeServer,
    setActiveServer,
    getEstimatedRam,
    canStartActiveGame,
    isAdmin,
  } = useGameStore();

  const game = GAME_CATALOG[activeGameId];
  const config = configPerGame[activeGameId] || game.defaultConfig;
  const currentEngine = game.engines.find((e) => e.id === config.engineId) || game.engines[0];
  const [metrics, setMetrics] = useState<StreamData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Komut satırı ve Geçmişi (ArrowUp / ArrowDown navigation, 50 komut, localStorage)
  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const draftCommandRef = useRef<string>("");
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const termRef = useRef<{ write: (text: string) => void; writeln: (text: string) => void } | null>(null);

  // localStorage'dan komut geçmişini yükle (oyun bazında)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(`xivizley_cmd_history_${activeGameId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCommandHistory(parsed.slice(0, 50));
        }
      } else {
        setCommandHistory([]);
      }
    } catch {
      setCommandHistory([]);
    }
    setHistoryIndex(-1);
    draftCommandRef.current = "";
  }, [activeGameId]);

  // ArrowUp / ArrowDown ile komut geçmişinde gezinme (draft korunur)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      if (commandHistory.length === 0) return;
      e.preventDefault();

      if (historyIndex === -1) {
        draftCommandRef.current = commandInput;
        const nextIndex = 0;
        setHistoryIndex(nextIndex);
        setCommandInput(commandHistory[nextIndex]);
      } else if (historyIndex < commandHistory.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setCommandInput(commandHistory[nextIndex]);
      }
    } else if (e.key === "ArrowDown") {
      if (historyIndex === -1) return;
      e.preventDefault();

      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setCommandInput(commandHistory[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput(draftCommandRef.current);
      }
    }
  };

  // SSE Metrik Akışı
  useEffect(() => {
    const sse = new EventSource(`/api/metrics/stream?gameId=${encodeURIComponent(activeGameId)}`);

    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as StreamData;
        setMetrics(data);

        // Canlı çalışan sunucu store'a kaydedilir
        if (data.container) {
          setActiveServer({
            containerId: data.container.containerId,
            gameId: activeGameId,
            status: data.container.status,
          });
        }
      } catch {
        // parsing hatası
      }
    };

    return () => {
      sse.close();
    };
  }, [activeGameId, setActiveServer]);

  // RAM Hesaplaması & Güvenlik Buffer'ı (Claude Tavsiyesi)
  const estimatedRam = getEstimatedRam(activeGameId);
  const containerMemLimit = getContainerMemoryLimitMb(estimatedRam);
  const ramSafety = checkRamSafety(estimatedRam);

  // Başlatma Uygunluğu Kontrolü (Tek Aktif Sunucu Kuralı - Claude Tavsiyesi)
  const startEligibility = canStartActiveGame();

  const currentStatus: ServerStatus = metrics?.container?.status || "stopped";
  const isRunning = currentStatus === "running";

  // Başlat / Durdur / Yeniden Başlat
  const handleServerAction = async (action: "start" | "stop" | "restart") => {
    if (!isAdmin) return;
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
            containerId: json.data?.container || `xivizley-${activeGameId}-server`,
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

  // Komut Gönderimi (CommandAdapter - Claude Tavsiyesi)
  const handleSendCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmdToSend = commandInput.trim();
    setCommandInput("");
    setHistoryIndex(-1);
    draftCommandRef.current = "";

    // Komutu geçmişe ekle ve localStorage'a kaydet (en son gönderilen başta, max 50)
    setCommandHistory((prev) => {
      const filtered = prev.filter((c) => c !== cmdToSend);
      const updated = [cmdToSend, ...filtered].slice(0, 50);
      try {
        localStorage.setItem(`xivizley_cmd_history_${activeGameId}`, JSON.stringify(updated));
      } catch {
        // storage quota
      }
      return updated;
    });

    setIsSendingCommand(true);
    setCommandFeedback(null);

    // Terminale hemen yaz (Instant Echo)
    termRef.current?.writeln(`\r\n\x1b[36m>\x1b[0m \x1b[1m${cmdToSend}\x1b[0m`);

    try {
      const res = await fetch("/api/server/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: activeGameId,
          command: cmdToSend,
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        const resp = json.data?.response || `[Başarılı] Komut iletildi: ${cmdToSend}`;
        setCommandFeedback(resp);
        // Çok satırlı yanıtı terminale düzgün yazdır
        const lines = resp.split("\n");
        for (const line of lines) {
          termRef.current?.writeln(`\x1b[32m${line}\x1b[0m`);
        }
      } else {
        const errMsg = json.message || json.data?.error || "Komut yürütülemedi";
        setCommandFeedback(`[Hata] ${errMsg}`);
        termRef.current?.writeln(`\x1b[31m[Hata] ${errMsg}\x1b[0m`);
      }
    } catch (err: any) {
      const netErr = err.message || "Bağlantı hatası";
      setCommandFeedback(`[Hata] ${netErr}`);
      termRef.current?.writeln(`\x1b[31m[Hata] ${netErr}\x1b[0m`);
    } finally {
      setIsSendingCommand(false);
      setTimeout(() => setCommandFeedback(null), 5000);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!hideHeader && (
        <>
          {/* 1. ÜST HERO & CANLI AKSİYON KARTI */}
          <div className="p-5 rounded-xl bg-[#141d2a] border border-[#1f2d40] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#0f1722] border border-[#1f2d40] flex items-center justify-center text-2xl shadow-sm">
                {game.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{game.name} Sunucusu</h2>
                  <StatusBadge status={currentStatus} size="sm" />
                  <span className="text-[11px] font-mono text-[#1AD76F] bg-[#1AD76F]/10 px-2 py-0.5 rounded-full border border-[#1AD76F]/30">
                    {currentEngine?.name.split(" ")[0]} v{config.version}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>Port: {config.port || game.defaultPort}</span>
                  <span>•</span>
                  <span className="font-mono text-[#1AD76F]">
                    {game.protocol === "stdin" ? "STDIN Konsol" : "RCON Soket"}
                  </span>
                </div>
              </div>
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5">
              {!startEligibility.allowed && (
                <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl max-w-xs text-right">
                  {startEligibility.reason}
                </div>
              )}

              {actionError && (
                <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl max-w-xs text-right">
                  {actionError}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!isAdmin || isRunning || !startEligibility.allowed || !!actionLoading}
                  isLoading={actionLoading === "start"}
                  onClick={() => handleServerAction("start")}
                  className="bg-[#1AD76F] text-black font-extrabold hover:bg-[#18c465] shadow-sm"
                >
                  Başlat
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!isAdmin || !isRunning || !!actionLoading}
                  isLoading={actionLoading === "restart"}
                  onClick={() => handleServerAction("restart")}
                >
                  Yeniden Başlat
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  disabled={!isAdmin || !isRunning || !!actionLoading}
                  isLoading={actionLoading === "stop"}
                  onClick={() => handleServerAction("stop")}
                >
                  Durdur
                </Button>
              </div>
            </div>
          </div>

          {/* 2. DİNAMİK KAYNAK VE METRİK GÖSTERGELERİ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* RAM ve Bellek Güvenlik Göstergesi */}
            <div className="p-4 rounded-xl bg-[#141d2a] border border-[#1f2d40] shadow-sm flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-200">Bellek Dağılımı & Güvenlik</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                    +%15 Headroom Buffer
                  </span>
                </div>
                <span className="font-mono text-white font-bold">
                  {metrics?.container.memUsageMb || 0} / {containerMemLimit} MB
                </span>
              </div>

              {/* Çift Katmanlı / Multi-segment RAM Güvenlik Çubuğu */}
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-[#0d131d] rounded-full overflow-hidden p-0.5 flex border border-[#1f2d40] relative">
                  {/* Taban Tahmin Arka Planı */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-blue-500/10 border-r border-blue-400/40"
                    style={{ width: `${Math.min(100, Math.round((estimatedRam / containerMemLimit) * 100))}%` }}
                    title={`Taban Tahmin: ${estimatedRam} MB`}
                  />
                  {/* Canlı Kullanılan RAM */}
                  <div
                    className={`h-full rounded-full transition-all duration-500 relative z-10 ${
                      ((metrics?.container.memUsageMb || 0) / containerMemLimit) > 0.9
                        ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                        : ((metrics?.container.memUsageMb || 0) / containerMemLimit) > 0.75
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                        : "bg-gradient-to-r from-emerald-500 to-[#1AD76F] shadow-[0_0_8px_rgba(26,215,111,0.3)]"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round(((metrics?.container.memUsageMb || 0) / containerMemLimit) * 100))}%`,
                    }}
                  />
                </div>

                {/* Lejant & Değerler */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1 text-slate-200">
                      <span className="w-2 h-2 rounded-full bg-[#1AD76F]" />
                      Aktif: {metrics?.container.memUsageMb || 0} MB
                    </span>
                    <span className="flex items-center gap-1 text-cyan-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      Taban: {estimatedRam} MB
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      Tampon: +{containerMemLimit - estimatedRam} MB
                    </span>
                  </div>
                  <span>Limit: {containerMemLimit} MB</span>
                </div>
              </div>

              {/* Host Emniyet Durumu */}
              <div className="flex items-center justify-between pt-1 border-t border-[#1f2d40]/60 text-[11px]">
                <span className="text-slate-400">Host Güvenli Sınırı (%80):</span>
                <span className={`font-mono font-semibold ${ramSafety.isSafe ? "text-emerald-400" : "text-rose-400 font-bold"}`}>
                  {containerMemLimit} / {ramSafety.hostSafeLimitMb} MB ({Math.round((containerMemLimit / ramSafety.hostSafeLimitMb) * 100)}%)
                </span>
              </div>

              {!ramSafety.isSafe && (
                <div className="text-[10px] text-rose-400 bg-rose-500/15 p-2 rounded-lg border border-rose-500/30 flex items-start gap-1.5">
                  <span className="text-sm">🚨</span>
                  <span>{ramSafety.reason || `Host Güvenli Sınırı (${ramSafety.hostSafeLimitMb} MB) aşıldı! Çökme riskine karşı kaynak azaltın.`}</span>
                </div>
              )}
            </div>

            {/* CPU Göstergesi */}
            <div className="p-4 rounded-xl bg-[#141d2a] border border-[#1f2d40] shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">İşlemci Kullanımı</span>
                <span className="font-mono text-white font-bold">
                  {metrics?.container.cpuPercent || 0}%
                </span>
              </div>

              <MetricGauge
                label="Konteyner CPU Yükü"
                value={metrics?.container.cpuPercent || 0}
                unit="%"
                size="sm"
                thresholds={{ warning: 70, critical: 90 }}
                helperText={`Host CPU: %${metrics?.host.cpuUsagePercent || 0} (${metrics?.host.totalCpuCores || 4} Çekirdek)`}
              />
            </div>
          </div>
        </>
      )}

      {/* 3. CANLI XTERM KONSOLU */}
      <div className="flex flex-col gap-2">
        <TerminalLogViewer
          title={`${game.name} Canlı Sunucu Konsolu`}
          status={currentStatus}
          gameId={activeGameId}
          onTerminalReady={(term) => {
            termRef.current = term;
          }}
        />

        {/* 4. MCServerHost Hızlı Komut Çipleri */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-400 font-mono flex items-center gap-1 mr-1">
            <span className="text-[#1AD76F]">⚡</span> Hızlı Komutlar:
          </span>
          {[
            { cmd: "list", label: "list (Oyuncular)" },
            { cmd: "tps", label: "tps (Performans)" },
            { cmd: "help", label: "help (Yardım)" },
            { cmd: "save-all", label: "save-all (Kaydet)" },
            { cmd: "whitelist list", label: "whitelist" },
          ].map((item) => (
            <button
              key={item.cmd}
              type="button"
              disabled={!isAdmin}
              onClick={() => {
                if (isAdmin) {
                  setCommandInput(item.cmd);
                  setHistoryIndex(-1);
                }
              }}
              className="px-2 py-0.5 rounded-md bg-[#131b26] hover:bg-[#1a2536] border border-[#1e2a3c] hover:border-[#1AD76F]/50 text-slate-300 hover:text-white text-[10px] font-mono transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 5. KOMUT GÖNDERME ÇUBUĞU (CommandAdapter ile Senkronize & Geçmiş Destekli) */}
        <form onSubmit={handleSendCommand} className="flex items-center gap-2 mt-1">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#1AD76F] font-bold">
              &gt;
            </span>
            <input
              type="text"
              disabled={!isAdmin}
              value={commandInput}
              onChange={(e) => {
                setCommandInput(e.target.value);
                if (historyIndex !== -1) setHistoryIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                !isAdmin
                  ? "🔒 Konsol komutu göndermek için sağ üstten Yönetici Girişi yapmalısınız (Canlı log izleme aktif)..."
                  : `${game.name} konsoluna komut yazın (↑/↓ geçmişte gezin, Enter gönder)...`
              }
              className="w-full bg-[#111824] border border-[#1f2d40] rounded-xl pl-7 pr-16 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#1AD76F] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {historyIndex !== -1 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/50">
                {historyIndex + 1}/{commandHistory.length}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!isAdmin || !commandInput.trim() || isSendingCommand}
            className="px-5 py-2 bg-[#1AD76F] hover:bg-[#18c465] text-black rounded-xl text-xs font-extrabold shadow-[0_0_15px_rgba(26,215,111,0.25)] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            {isSendingCommand ? <span>İletiliyor...</span> : <span>{!isAdmin ? "🔒 Kilitli" : "Gönder ↵"}</span>}
          </button>
        </form>

        {commandFeedback && (
          <div className="text-[11px] font-mono px-3 py-1.5 rounded-lg bg-[#181e24] border border-[#2d3748] text-slate-300">
            {commandFeedback}
          </div>
        )}
      </div>
    </div>
  );
}
