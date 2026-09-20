"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, Button, MetricGauge, StatusBadge, type ServerStatus } from "@xivizley/aurora-ui";
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

export default function GamePanelPage() {
  const [metrics, setMetrics] = useState<StreamData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // 1. SSE /api/metrics/stream dinleyicisi
  useEffect(() => {
    const sse = new EventSource("/api/metrics/stream");

    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as StreamData;
        setMetrics(data);
      } catch {
        // format hatası
      }
    };

    return () => {
      sse.close();
    };
  }, []);

  // 2. Docker Start/Stop/Restart Aksiyonları
  const handleAction = async (action: "start" | "stop" | "restart") => {
    setActionLoading(action);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/server/${action}`, { method: "POST" });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setActionMessage(`Hata: ${json.message || "İşlem başarısız"}`);
      } else {
        setActionMessage(`İşlem başarılı: ${action.toUpperCase()}`);
      }
    } catch {
      setActionMessage("Sunucuya bağlanılamadı.");
    } finally {
      setActionLoading(null);
    }
  };

  const containerStatus = metrics?.container?.status || "stopped";
  const isRunning = containerStatus === "running";

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      {/* Üst Bar: Sunucu Adı, Durum ve Aksiyon Butonları */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-aurora aurora-glass border border-aurora">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-aurora-surface border border-aurora-cyan/30 flex items-center justify-center text-aurora-cyan shadow-aurora-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="3" />
              <path d="M6 12h4m-2-2v4m7-2h.01m3 0h.01" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-aurora-text-primary flex items-center gap-2">
              FiveM Roleplay Sunucusu
              <StatusBadge status={containerStatus} size="sm" />
            </h1>
            <p className="text-xs text-aurora-text-muted font-mono">
              Container: fivem-server | Port: 30120 | Öncelik: Real-time (-500 OOM)
            </p>
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex items-center gap-2.5">
          {actionMessage && (
            <span className="text-xs text-aurora-cyan hidden lg:inline mr-2 animate-pulse">
              {actionMessage}
            </span>
          )}

          <Button
            variant="primary"
            size="sm"
            disabled={isRunning || !!actionLoading}
            isLoading={actionLoading === "start"}
            onClick={() => handleAction("start")}
          >
            Başlat
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={!isRunning || !!actionLoading}
            isLoading={actionLoading === "restart"}
            onClick={() => handleAction("restart")}
          >
            Yeniden Başlat
          </Button>

          <Button
            variant="danger"
            size="sm"
            disabled={!isRunning || !!actionLoading}
            isLoading={actionLoading === "stop"}
            onClick={() => handleAction("stop")}
          >
            Durdur
          </Button>
        </div>
      </header>

      {/* Kaynak Metrikleri (MetricGauge Kartları) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* FiveM Konteyner RAM & CPU */}
        <Card header={<span className="text-sm font-semibold text-aurora-cyan">FiveM Kaynak Kullanımı</span>}>
          <div className="space-y-4">
            <MetricGauge
              label="Konteyner RAM"
              value={metrics?.container.memUsageMb || 0}
              max={metrics?.container.memLimitMb || 4096}
              unit="MB"
              size="md"
              helperText={`Ayrılan Limit: ${metrics?.container.memLimitMb || 4096} MB`}
            />

            <MetricGauge
              label="Konteyner CPU"
              value={metrics?.container.cpuPercent || 0}
              unit="%"
              size="md"
              helperText="İşlemci tüketimi"
            />
          </div>
        </Card>

        {/* Host Donanım & Resource Governor Eşikleri */}
        <Card header={<span className="text-sm font-semibold text-aurora-text-primary">Sunucu Donanımı (Resource Governor)</span>}>
          <div className="space-y-4">
            <MetricGauge
              label="Host Toplam RAM"
              value={metrics?.host.usedRamMb || 0}
              max={metrics?.host.totalRamMb || 8192}
              unit="MB"
              size="md"
              thresholds={{ warning: 80, critical: 90 }}
              helperText="⚠️ %80: Brain LLM askıya alma | 🚨 %90: Vault AI durdurma"
            />

            <MetricGauge
              label="Host Ortalama CPU"
              value={metrics?.host.cpuUsagePercent || 0}
              unit="%"
              size="md"
              helperText={`${metrics?.host.totalCpuCores || 4} Çekirdek aktif`}
            />
          </div>
        </Card>
      </div>

      {/* Web Konsolu (ConsoleViewer + xterm.js) */}
      <div className="space-y-2">
        <TerminalLogViewer title="FiveM Canlı Sunucu Konsolu" status={containerStatus} />
      </div>
    </div>
  );
}
