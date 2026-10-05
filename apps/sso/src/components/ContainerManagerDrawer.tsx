"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Square,
  RefreshCw,
  Trash2,
  ExternalLink,
  Terminal,
  Activity,
  Cpu,
  HardDrive,
  Copy,
  Check,
  ArrowDown,
  Clock,
  AlertCircle,
  Layers,
} from "lucide-react";
import type { StoreApp } from "@/app/store/StoreClient";

interface ContainerManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  app: StoreApp | null;
  onAppUpdated?: () => void;
}

interface ContainerStats {
  status: "running" | "stopped" | "restarting";
  cpuPercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  memoryPercent?: number;
}

export function ContainerManagerDrawer({
  isOpen,
  onClose,
  app,
  onAppUpdated,
}: ContainerManagerDrawerProps) {
  const [logs, setLogs] = useState<string>("");
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"logs" | "details">("logs");

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLPreElement>(null);

  // Poll logs and stats while open
  useEffect(() => {
    if (!isOpen || !app) {
      setLogs("");
      setStats(null);
      setActionMessage(null);
      return;
    }

    let isMounted = true;

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/store/containers/${app.id}/logs`, {
          credentials: "include",
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.ok && json.logs) {
            setLogs(json.logs);
          } else if (json.logs) {
            setLogs(json.logs);
          }
        }
      } catch {
        // Sessiz hata
      }
    };

    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/store/containers/${app.id}/stats`, {
          credentials: "include",
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.ok && json.data) {
            setStats(json.data);
          }
        }
      } catch {
        // Sessiz hata
      }
    };

    setIsLoadingLogs(true);
    Promise.all([fetchLogs(), fetchStats()]).finally(() => {
      if (isMounted) setIsLoadingLogs(false);
    });

    const interval = setInterval(() => {
      fetchLogs();
      fetchStats();
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, app?.id]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  // Handle container actions: restart, stop, start
  const handleAction = async (action: "start" | "stop" | "restart") => {
    if (!app) return;
    try {
      setActionLoading(action);
      setActionMessage(null);
      const res = await fetch(`/api/store/containers/${app.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.ok) {
        setActionMessage({
          type: "success",
          text: json.message || "İşlem başarıyla tamamlandı.",
        });
        if (onAppUpdated) onAppUpdated();
      } else {
        setActionMessage({
          type: "error",
          text: json.message || "İşlem başarısız.",
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.message || "Bağlantı hatası oluştu.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Uninstall container
  const handleUninstall = async () => {
    if (!app) return;
    if (
      !confirm(
        `${app.name} (${app.id}) uygulamasını durdurup kaldırmak istediğinize emin misiniz?`,
      )
    )
      return;

    try {
      setActionLoading("uninstall");
      setActionMessage(null);
      const res = await fetch("/api/store/uninstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appId: app.id }),
      });
      const json = await res.json();
      if (json.ok) {
        setActionMessage({
          type: "success",
          text: json.message || "Uygulama başarıyla kaldırıldı.",
        });
        if (onAppUpdated) onAppUpdated();
        setTimeout(() => onClose(), 1200);
      } else {
        setActionMessage({
          type: "error",
          text: json.message || "Kaldırma işlemi başarısız.",
        });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err?.message || "Hata oluştu." });
    } finally {
      setActionLoading(null);
    }
  };

  const copyLogs = () => {
    if (!logs) return;
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !app) return null;

  const isRunning = stats ? stats.status === "running" : app.isRunning;
  const webPort = app.assignedPort || app.ports[0]?.internal;
  const webUrl =
    typeof window !== "undefined" && webPort
      ? `${window.location.protocol}//${window.location.hostname}:${webPort}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Drawer Overlay Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-2xl bg-[#181e24] border-l border-[#2d3748] h-full shadow-2xl flex flex-col text-slate-200 animate-in slide-in-from-right duration-200 overflow-hidden font-sans">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#2d3748] bg-[#222933] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#181e24] border border-[#2d3748] flex items-center justify-center text-[#0082c9] font-bold text-base shadow-sm">
              {app.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {app.name}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#181e24] text-slate-300 border border-[#2d3748] font-mono">
                  {app.category}
                </span>
                {isRunning ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Çalışıyor
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Durduruldu
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                xivizley-app-{app.id} • {app.dockerImage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {webUrl && (
              <a
                href={webUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Web Arayüzü</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#2b3442] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Message Alert Banner */}
        {actionMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-medium border-b flex items-center justify-between shrink-0 ${
              actionMessage.type === "success"
                ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-200"
                : "bg-rose-950/60 border-rose-700/60 text-rose-200"
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs underline hover:no-underline ml-3 opacity-80 hover:opacity-100"
            >
              Kapat
            </button>
          </div>
        )}

        {/* Live Metrics Bar (CPU / RAM / Port) */}
        <div className="p-4 bg-[#1f2631] border-b border-[#2d3748] grid grid-cols-3 gap-3 shrink-0">
          {/* CPU Metric */}
          <div className="p-2.5 rounded-lg bg-[#181e24] border border-[#2d3748] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-[#0082c9]" />
                CPU
              </span>
              <span className="font-mono font-semibold text-white">
                {stats ? `${stats.cpuPercent}%` : "—"}
              </span>
            </div>
            <div className="w-full bg-[#2d3748] h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  (stats?.cpuPercent || 0) > 80
                    ? "bg-rose-500"
                    : (stats?.cpuPercent || 0) > 50
                      ? "bg-amber-400"
                      : "bg-[#0082c9]"
                }`}
                style={{ width: `${Math.min(stats?.cpuPercent || 0, 100)}%` }}
              />
            </div>
          </div>

          {/* RAM Metric */}
          <div className="p-2.5 rounded-lg bg-[#181e24] border border-[#2d3748] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                Bellek (RAM)
              </span>
              <span className="font-mono font-semibold text-white">
                {stats ? `${stats.memoryUsedMb} MB` : "—"}
              </span>
            </div>
            <div className="w-full bg-[#2d3748] h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    stats?.memoryLimitMb
                      ? (stats.memoryUsedMb / stats.memoryLimitMb) * 100
                      : 0,
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Network Port */}
          <div className="p-2.5 rounded-lg bg-[#181e24] border border-[#2d3748] flex flex-col justify-center">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Erişim Portu
            </span>
            <span className="font-mono font-bold text-sky-400 text-xs mt-0.5">
              :{webPort || "Host"}
            </span>
          </div>
        </div>

        {/* Quick Actions Control Bar */}
        <div className="px-4 py-3 bg-[#181e24] border-b border-[#2d3748] flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={() => handleAction("restart")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2b3442] hover:bg-[#343e4f] text-slate-200 text-xs font-semibold border border-[#3b4758] transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${actionLoading === "restart" ? "animate-spin text-[#0082c9]" : ""}`}
              />
              <span>
                {actionLoading === "restart"
                  ? "Yeniden Başlatılıyor..."
                  : "Yeniden Başlat"}
              </span>
            </button>

            {isRunning ? (
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={() => handleAction("stop")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>
                  {actionLoading === "stop" ? "Durduruluyor..." : "Durdur"}
                </span>
              </button>
            ) : (
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={() => handleAction("start")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {actionLoading === "start" ? "Başlatılıyor..." : "Başlat"}
                </span>
              </button>
            )}

            {webUrl && (
              <a
                href={webUrl}
                target="_blank"
                rel="noreferrer"
                className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0082c9] text-white text-xs font-semibold"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Web UI</span>
              </a>
            )}
          </div>

          <button
            type="button"
            disabled={actionLoading !== null}
            onClick={handleUninstall}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors disabled:opacity-50 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              {actionLoading === "uninstall"
                ? "Kaldırılıyor..."
                : "Konteyneri Kaldır"}
            </span>
          </button>
        </div>

        {/* Tab Switcher: Logs vs Details */}
        <div className="px-4 bg-[#222933] border-b border-[#2d3748] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              onClick={() => setActiveTab("logs")}
              className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === "logs"
                  ? "border-[#0082c9] text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-[#0082c9]" />
              <span>Canlı Docker Logları</span>
            </button>
            <button
              onClick={() => setActiveTab("details")}
              className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === "details"
                  ? "border-[#0082c9] text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Yapılandırma & Hacimler</span>
            </button>
          </div>

          {activeTab === "logs" && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAutoScroll((prev) => !prev)}
                className={`p-1.5 rounded text-[11px] font-mono flex items-center gap-1 border transition-colors ${
                  autoScroll
                    ? "bg-[#0082c9]/20 text-[#38bdf8] border-[#0082c9]/40"
                    : "bg-[#181e24] text-slate-400 border-[#2d3748] hover:text-white"
                }`}
                title="Canlı Takip / Otomatik Kaydırma"
              >
                <ArrowDown className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {autoScroll ? "Oto-Kaydır: Açık" : "Oto-Kaydır: Kapalı"}
                </span>
              </button>

              <button
                type="button"
                onClick={copyLogs}
                className="p-1.5 rounded text-[11px] font-mono flex items-center gap-1 bg-[#181e24] text-slate-300 border border-[#2d3748] hover:text-white hover:bg-[#2b3442] transition-colors"
                title="Logları Kopyala"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">
                  {copied ? "Kopyalandı" : "Kopyala"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLogs("")}
                className="p-1.5 rounded text-[11px] font-mono text-slate-400 border border-[#2d3748] hover:text-white hover:bg-[#2b3442] transition-colors"
                title="Ekranı Temizle"
              >
                Temizle
              </button>
            </div>
          )}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col min-h-0 bg-[#12161b]">
          {activeTab === "logs" ? (
            <div className="flex-1 rounded-xl bg-[#0a0d11] border border-[#2d3748] p-3 overflow-hidden flex flex-col font-mono text-[11px] text-slate-300 shadow-inner">
              <div className="pb-2 mb-2 border-b border-[#1f2631] flex items-center justify-between text-[10px] text-slate-500">
                <span>$ docker logs --tail 150 -f xivizley-app-{app.id}</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  CANLI AKIŞ
                </span>
              </div>

              <pre
                ref={logContainerRef}
                className="flex-1 overflow-y-auto whitespace-pre-wrap break-all scrollbar-thin scrollbar-thumb-[#2d3748] scrollbar-track-transparent leading-relaxed font-mono select-text"
              >
                {logs ? (
                  logs
                ) : (
                  <span className="text-slate-500 italic">
                    {isLoadingLogs
                      ? "Log akışı yükleniyor..."
                      : "Henüz terminal log çıktısı oluşmadı veya konteyner kapalı."}
                  </span>
                )}
                <div ref={terminalEndRef} />
              </pre>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Environment Variables */}
              <div className="rounded-xl border border-[#2d3748] bg-[#1a2027] p-4 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0082c9]" />
                  Ortam Değişkenleri (Environment)
                </h4>
                {app.environment && app.environment.length > 0 ? (
                  <div className="space-y-1.5 font-mono text-xs">
                    {app.environment.map((env, i) => (
                      <div
                        key={i}
                        className="p-2 rounded bg-[#12161b] border border-[#2d3748] flex items-center justify-between gap-2"
                      >
                        <span className="text-sky-300 font-semibold">
                          {env.key}
                        </span>
                        <span className="text-slate-400 text-[11px] truncate max-w-[280px]">
                          {env.defaultValue || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Özel ortam değişkeni tanımlanmamış.
                  </p>
                )}
              </div>

              {/* Volumes / Storage */}
              <div className="rounded-xl border border-[#2d3748] bg-[#1a2027] p-4 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Kalıcı Depolama Hacimleri (Volumes)
                </h4>
                {app.volumes && app.volumes.length > 0 ? (
                  <div className="space-y-1.5 font-mono text-xs">
                    {app.volumes.map((vol, i) => (
                      <div
                        key={i}
                        className="p-2 rounded bg-[#12161b] border border-[#2d3748] flex flex-col gap-1 text-[11px]"
                      >
                        <span className="text-slate-300 font-semibold">
                          {vol.label || "Hacim"}
                        </span>
                        <div className="text-slate-400 flex items-center gap-1.5 truncate">
                          <span className="text-emerald-400">
                            {vol.hostPath}
                          </span>
                          <span>➔</span>
                          <span className="text-sky-300">
                            {vol.containerPath}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Kalıcı hacim yapılandırılmamış.
                  </p>
                )}
              </div>

              {/* Port Routing */}
              <div className="rounded-xl border border-[#2d3748] bg-[#1a2027] p-4 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Ağ Port Eşlemeleri (Network Ports)
                </h4>
                <div className="space-y-1.5 font-mono text-xs">
                  {app.ports.map((p, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-[#12161b] border border-[#2d3748] flex items-center justify-between text-[11px]"
                    >
                      <span className="text-slate-300">{p.label}</span>
                      <span className="text-sky-400 font-semibold">
                        Host {app.assignedPort || p.default} ➔ Konteyner{" "}
                        {p.internal}/{p.protocol || "tcp"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-[#181e24] border-t border-[#2d3748] flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
          <span>XIVIZLEY Docker Engine Hub v0.2</span>
          <span>NVMe SSD • Isolated Network</span>
        </div>
      </div>
    </div>
  );
}
