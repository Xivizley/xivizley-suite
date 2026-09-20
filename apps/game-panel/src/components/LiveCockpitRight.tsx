"use client";

import { useState, useEffect } from "react";
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
      <div className="w-full h-80 rounded-aurora aurora-glass border border-aurora flex items-center justify-center">
        <span className="text-xs text-aurora-text-muted font-mono">Terminal yükleniyor...</span>
      </div>
    ),
  }
);

interface StreamData {
  container: ContainerMetrics & { status: ServerStatus };
  host: HostMetrics;
}

export function LiveCockpitRight() {
  const {
    activeGameId,
    activeServer,
    setActiveServer,
    getEstimatedRam,
    canStartActiveGame,
  } = useGameStore();

  const game = GAME_CATALOG[activeGameId];
  const [metrics, setMetrics] = useState<StreamData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Komut satırı durumu
  const [commandInput, setCommandInput] = useState("");
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

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
    if (!commandInput.trim() || isSendingCommand) return;

    const cmdToSend = commandInput.trim();
    setCommandInput("");
    setIsSendingCommand(true);
    setCommandFeedback(null);

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
        setCommandFeedback(json.data?.response || `[Başarılı] Komut iletildi: ${cmdToSend}`);
      } else {
        setCommandFeedback(`[Hata] ${json.message || json.data?.error || "Komut yürütülemedi"}`);
      }
    } catch (err: any) {
      setCommandFeedback(`[Hata] ${err.message || "Bağlantı hatası"}`);
    } finally {
      setIsSendingCommand(false);
      setTimeout(() => setCommandFeedback(null), 4000);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. ÜST HERO & CANLI AKSİYON KARTI */}
      <div className="p-5 rounded-2xl bg-aurora-bg-card/50 border border-aurora-border-light/20 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-aurora-bg-dark border border-aurora-cyan/30 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(0,242,254,0.15)]">
            {game.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{game.name} Sunucusu</h2>
              <StatusBadge status={currentStatus} size="sm" />
            </div>
            <div className="flex items-center gap-2 text-xs text-aurora-text-muted mt-0.5">
              <span>Port: {game.defaultPort}</span>
              <span>•</span>
              <span className="font-mono text-aurora-cyan/80">
                {game.protocol === "stdin" ? "STDIN Konsol" : "RCON Soket"}
              </span>
            </div>
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5">
          {/* Tek Aktif Sunucu Kuralı veya RAM Uyarısı */}
          {!startEligibility.allowed && (
            <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl max-w-xs text-right">
              {startEligibility.reason}
            </div>
          )}

          {actionError && (
            <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl max-w-xs text-right animate-pulse">
              {actionError}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={isRunning || !startEligibility.allowed || !!actionLoading}
              isLoading={actionLoading === "start"}
              onClick={() => handleServerAction("start")}
            >
              Başlat
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={!isRunning || !!actionLoading}
              isLoading={actionLoading === "restart"}
              onClick={() => handleServerAction("restart")}
            >
              Yeniden Başlat
            </Button>

            <Button
              variant="danger"
              size="sm"
              disabled={!isRunning || !!actionLoading}
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
        {/* RAM Göstergesi */}
        <div className="p-4 rounded-2xl bg-aurora-bg-card/40 border border-aurora-border-light/20 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-aurora-cyan">Dinamik RAM İhtiyacı</span>
            <span className="font-mono text-white font-bold">{estimatedRam} MB</span>
          </div>

          <MetricGauge
            label="Konteyner RAM Limiti (%15 Buffer)"
            value={metrics?.container.memUsageMb || 0}
            max={containerMemLimit}
            unit="MB"
            size="sm"
            helperText={`Konteyner Limiti: ${containerMemLimit} MB | Taban: ${game.minRamMb} MB`}
          />

          {!ramSafety.isSafe && (
            <div className="text-[10px] text-red-400 bg-red-500/15 p-1.5 rounded-lg border border-red-500/30">
              🚨 Host Güvenli Sınırı ({ramSafety.hostSafeLimitMb} MB) aşıldı!
            </div>
          )}
        </div>

        {/* CPU Göstergesi */}
        <div className="p-4 rounded-2xl bg-aurora-bg-card/40 border border-aurora-border-light/20 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-aurora-text-primary">İşlemci Kullanımı</span>
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

      {/* 3. CANLI XTERM KONSOLU */}
      <div className="flex flex-col gap-2">
        <TerminalLogViewer
          title={`${game.name} Canlı Sunucu Konsolu`}
          status={currentStatus}
          gameId={activeGameId}
        />

        {/* 4. KOMUT GÖNDERME ÇUBUĞU (CommandAdapter ile Senkronize) */}
        <form onSubmit={handleSendCommand} className="flex items-center gap-2 mt-1">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-aurora-cyan">
              &gt;
            </span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder={`${game.name} konsoluna komut yazın (örn: status, help, save-all, kick)...`}
              className="w-full bg-aurora-bg-dark border border-aurora-border-light/30 rounded-xl pl-7 pr-3 py-2 text-xs font-mono text-white placeholder-aurora-text-muted/50 focus:outline-none focus:border-aurora-cyan transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={!commandInput.trim() || isSendingCommand}
            className="px-4 py-2 bg-aurora-cyan/20 text-aurora-cyan border border-aurora-cyan/40 hover:bg-aurora-cyan/30 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            {isSendingCommand ? <span>İletiliyor...</span> : <span>Gönder ↵</span>}
          </button>
        </form>

        {commandFeedback && (
          <div className="text-[11px] font-mono px-3 py-1.5 rounded-lg bg-aurora-bg-dark/90 border border-aurora-border-light/30 text-aurora-cyan">
            {commandFeedback}
          </div>
        )}
      </div>
    </div>
  );
}
