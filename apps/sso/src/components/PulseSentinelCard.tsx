"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Send,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Server,
  Cpu,
  HardDrive,
  Activity,
  X,
  RefreshCw,
  Clock,
  Sparkles,
  Check,
} from "lucide-react";
import type { SentinelStatus } from "@/server/services/sentinelService";

export function PulseSentinelCard() {
  const [status, setStatus] = useState<SentinelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTestSending, setIsTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Form State for Config Modal
  const [configForm, setConfigForm] = useState({
    cpuPercent: 85,
    ramPercent: 90,
    diskPercent: 85,
    debounceMinutes: 30,
    telegramChatId: "",
  });

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/sentinel/status");
      const data = await res.json();
      if (data.ok && data.data) {
        setStatus(data.data);
        setConfigForm((prev) => ({
          ...prev,
          cpuPercent: data.data.thresholds.cpuPercent,
          ramPercent: data.data.thresholds.ramPercent,
          diskPercent: data.data.thresholds.diskPercent,
          debounceMinutes: data.data.thresholds.debounceMinutes,
          telegramChatId: data.data.telegramChatId || "",
        }));
      }
    } catch (err) {
      console.error("Sentinel durumu alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSendTestAlert = async () => {
    setIsTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/sentinel/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: configForm.telegramChatId || undefined }),
      });
      const data = await res.json();
      setTestResult({
        ok: data.ok,
        message: data.message || (data.ok ? "Test uyarısı başarıyla iletildi!" : "Gönderim başarısız."),
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || "Ağ hatası: Test bildirimi gönderilemedi.",
      });
    } finally {
      setIsTestSending(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigSuccess(false);
    setConfigError(null);
    try {
      const res = await fetch("/api/sentinel/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });
      const data = await res.json();
      if (data.ok) {
        setConfigSuccess(true);
        await fetchStatus();
        setTimeout(() => {
          setIsConfigOpen(false);
          setConfigSuccess(false);
        }, 1200);
      } else {
        setConfigError(data.message || "Ayarlar kaydedilemedi (Yönetici yetkisi gereklidir).");
      }
    } catch (err: any) {
      console.error("Ayarlar kaydedilemedi:", err);
      setConfigError(err?.message || "Bağlantı hatası.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const formatGb = (bytes?: number) => {
    if (!bytes) return "0.0 GB";
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return "0s";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}g ${h}s`;
    return `${h}s ${m}d`;
  };

  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#222933] overflow-hidden shadow-sm">
      {/* ─── Card Header ────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 border-b border-[#2d3748]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#222933] to-[#252f3d]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0082c9]/15 border border-[#0082c9]/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5 text-[#0082c9]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                VDS Sistem Bekçisi & Telegram Kalkanı (Sentinel)
              </h2>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                Canlı Koruma
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              NVMe Disk, Host CPU, Bellek ve Konteyner sağlığı 7/24 denetlenir; darboğaz anında botla anında uyarır.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSendTestAlert}
            disabled={isTestSending}
            className="h-8 px-3 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            title="Telegram'a deneme alarm kartı gönderir"
          >
            {isTestSending ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>{isTestSending ? "Gönderiliyor..." : "Test Bildirimi Gönder"}</span>
          </button>

          <button
            onClick={() => setIsConfigOpen(true)}
            className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
            title="Eşik değerleri ve Telegram Chat ID'sini düzenle"
          >
            <Sliders className="h-3.5 w-3.5 text-slate-300" />
            <span>Ayarlar & Eşikler</span>
          </button>
        </div>
      </div>

      {/* ─── Feedback Toast ─────────────────────────────────────── */}
      {testResult && (
        <div
          className={`mx-5 mt-4 p-3 rounded-lg text-xs font-medium flex items-center justify-between border ${
            testResult.ok
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.ok ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
          <button
            onClick={() => setTestResult(null)}
            className="opacity-70 hover:opacity-100 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── Card Body ──────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 space-y-5">
        {loading ? (
          <div className="py-8 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#0082c9] mb-2" />
            <p className="text-xs">Bekçi donanım verileri taranıyor...</p>
          </div>
        ) : (
          <>
            {/* Host Bilgisi & Uptime */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#181e24]/70 p-3 rounded-xl border border-[#2d3748]">
              <div className="flex items-center gap-3">
                <Server className="h-4 w-4 text-[#0082c9]" />
                <div>
                  <span className="text-xs font-bold text-slate-200">
                    {status?.host.hostname || "xivizley-vds"}
                  </span>
                  <span className="text-[11px] text-slate-400 ml-2">
                    {status?.host.platform}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Açık Kalma:</span>
                  <span className="text-slate-200 font-bold">
                    {formatUptime(status?.host.uptimeSeconds)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-slate-400">Telegram:</span>
                  <span className="text-emerald-400 font-bold">
                    {status?.telegramConfigured ? "Bağlı" : "Chat ID Bekleniyor"}
                  </span>
                </div>
              </div>
            </div>

            {/* Canlı Donanım Metrik Çubukları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. CPU Bar */}
              <div className="p-3.5 rounded-xl bg-[#1b222c] border border-[#2d3748] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-sky-400" />
                    <span className="text-xs font-semibold text-slate-300">İşlemci (CPU)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    %{status?.host.cpu.usagePercent ?? 0}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (status?.host.cpu.usagePercent || 0) >= (status?.thresholds.cpuPercent || 85)
                        ? "bg-rose-500"
                        : (status?.host.cpu.usagePercent || 0) >= 70
                        ? "bg-amber-500"
                        : "bg-sky-500"
                    }`}
                    style={{ width: `${Math.min(100, status?.host.cpu.usagePercent || 0)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>{status?.host.cpu.cores} Çekirdek</span>
                  <span>1m: {status?.host.cpu.loadAvg1m} (Eşik: %{status?.thresholds.cpuPercent})</span>
                </div>
              </div>

              {/* 2. RAM Bar */}
              <div className="p-3.5 rounded-xl bg-[#1b222c] border border-[#2d3748] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-semibold text-slate-300">Bellek (RAM)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-400">
                    %{status?.host.ram.usagePercent ?? 0}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (status?.host.ram.usagePercent || 0) >= (status?.thresholds.ramPercent || 90)
                        ? "bg-rose-500"
                        : (status?.host.ram.usagePercent || 0) >= 75
                        ? "bg-amber-500"
                        : "bg-purple-500"
                    }`}
                    style={{ width: `${Math.min(100, status?.host.ram.usagePercent || 0)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>{formatGb(status?.host.ram.usedBytes)} / {formatGb(status?.host.ram.totalBytes)}</span>
                  <span>Eşik: %{status?.thresholds.ramPercent}</span>
                </div>
              </div>

              {/* 3. Disk Bar */}
              <div className="p-3.5 rounded-xl bg-[#1b222c] border border-[#2d3748] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-300">NVMe Depolama</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    %{status?.host.disk.usagePercent ?? 0}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (status?.host.disk.usagePercent || 0) >= (status?.thresholds.diskPercent || 85)
                        ? "bg-rose-500"
                        : (status?.host.disk.usagePercent || 0) >= 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, status?.host.disk.usagePercent || 0)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>{formatGb(status?.host.disk.usedBytes)} / {formatGb(status?.host.disk.totalBytes)}</span>
                  <span>Eşik: %{status?.thresholds.diskPercent}</span>
                </div>
              </div>
            </div>

            {/* Docker Konteyner Sağlık Tablosu */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Takip Edilen Temel Konteynerler
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {status?.containers.map((c) => (
                  <div
                    key={c.name}
                    className="p-2.5 rounded-lg bg-[#181e24] border border-[#2d3748] flex items-center justify-between"
                  >
                    <div className="overflow-hidden">
                      <p className="text-xs font-mono font-bold text-slate-200 truncate">
                        {c.name}
                      </p>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {c.uptime || c.status}
                      </span>
                    </div>
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        c.isHealthy ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-rose-500 animate-ping"
                      }`}
                      title={c.isHealthy ? "Çalışıyor" : "Ulaşılamıyor / Durdu"}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Eşik Değerleri & Ayarlar Modalı ─────────────────────── */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-[#2d3748] bg-[#1e2530] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2d3748]">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#0082c9]" />
                <h3 className="text-base font-bold text-white">
                  Sentinel Bekçi Eşikleri & Telegram
                </h3>
              </div>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              {configError && (
                <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-950/30 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{configError}</span>
                </div>
              )}

              {/* CPU Eşiği */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-slate-300">
                  <label htmlFor="cpu-percent">CPU Alarm Eşiği</label>
                  <span className="font-mono text-sky-400">%{configForm.cpuPercent}</span>
                </div>
                <input
                  id="cpu-percent"
                  type="range"
                  min="50"
                  max="98"
                  value={configForm.cpuPercent}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, cpuPercent: Number(e.target.value) }))
                  }
                  className="w-full accent-[#0082c9] cursor-pointer"
                />
                <span className="text-[10px] text-slate-400">Bu değer aşıldığında Telegram'a uyarı gönderilir.</span>
              </div>

              {/* RAM Eşiği */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-slate-300">
                  <label htmlFor="ram-percent">RAM Alarm Eşiği</label>
                  <span className="font-mono text-purple-400">%{configForm.ramPercent}</span>
                </div>
                <input
                  id="ram-percent"
                  type="range"
                  min="50"
                  max="98"
                  value={configForm.ramPercent}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, ramPercent: Number(e.target.value) }))
                  }
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400">OOM riskine karşı kritik bellek doluluk limiti.</span>
              </div>

              {/* Disk Eşiği */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-slate-300">
                  <label htmlFor="disk-percent">Disk Alarm Eşiği</label>
                  <span className="font-mono text-emerald-400">%{configForm.diskPercent}</span>
                </div>
                <input
                  id="disk-percent"
                  type="range"
                  min="50"
                  max="98"
                  value={configForm.diskPercent}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, diskPercent: Number(e.target.value) }))
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400">NVMe disk alanı tükenme erken uyarısı.</span>
              </div>

              {/* Cooldown Debounce */}
              <div className="space-y-1">
                <label htmlFor="debounce-minutes" className="font-medium text-slate-300">
                  Anti-Spam Bildirim Aralığı (Dakika)
                </label>
                <input
                  id="debounce-minutes"
                  type="number"
                  min="5"
                  max="120"
                  value={configForm.debounceMinutes}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, debounceMinutes: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#141920] border border-[#2d3748] text-white focus:outline-hidden focus:border-[#0082c9]"
                />
                <span className="text-[10px] text-slate-400">Aynı alarmın tekrar gönderilmesi arasındaki bekleme süresi.</span>
              </div>

              {/* Telegram Chat ID */}
              <div className="space-y-1">
                <label htmlFor="telegram-chat-id" className="font-medium text-slate-300">
                  Telegram Chat ID
                </label>
                <input
                  id="telegram-chat-id"
                  type="text"
                  placeholder="Örn: 123456789 veya -100123456789"
                  value={configForm.telegramChatId}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, telegramChatId: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#141920] border border-[#2d3748] text-white font-mono focus:outline-hidden focus:border-[#0082c9]"
                />
                <span className="text-[10px] text-slate-400">
                  @userinfobot veya @getmyid_bot üzerinden alabileceğiniz Telegram ID'niz.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2d3748]">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-medium transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-4 py-2 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSavingConfig ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : configSuccess ? (
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                  ) : null}
                  <span>{configSuccess ? "Kaydedildi!" : "Ayarları Kaydet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
