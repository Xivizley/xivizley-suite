"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Cpu,
  HardDrive,
  Server,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface SentinelData {
  host: {
    hostname: string;
    uptimeSeconds: number;
    cpu: { cores: number; usagePercent: number; isAlert: boolean };
    ram: { totalBytes: number; usedBytes: number; usagePercent: number; isAlert: boolean };
    disk: { totalBytes: number; usedBytes: number; usagePercent: number; isAlert: boolean };
  };
  containers: Array<{
    name: string;
    status: string;
    isHealthy: boolean;
    uptime?: string;
  }>;
}

export function SentinelRadarWidget() {
  const [data, setData] = useState<SentinelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDegraded, setIsDegraded] = useState(false);

  const fetchSentinel = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    try {
      setIsLoading(true);
      const res = await fetch("/api/sentinel/status", {
        signal: controller.signal,
        credentials: "include",
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          setData(json.data);
          setIsDegraded(false);
          return;
        }
      }
      setIsDegraded(true);
    } catch {
      setIsDegraded(true);
    } finally {
      setIsLoading(false);
      clearTimeout(timeout);
    }
  };

  useEffect(() => {
    fetchSentinel();
    const interval = setInterval(fetchSentinel, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatGb = (bytes?: number) => {
    if (!bytes) return "0 GB";
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#222933] p-5 flex flex-col justify-between space-y-4 shadow-sm">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                <span>VDS Sentinel & Telemetri</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h3>
              <p className="text-[10px] text-slate-400">Canlı sunucu donanımı ve konteyner bekçisi</p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchSentinel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2b3442] transition-colors"
            title="Yenile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Content */}
        {isLoading && !data ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <div className="w-5 h-5 border-2 border-[#0082c9] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Telemetri verisi alınıyor...</span>
          </div>
        ) : isDegraded && !data ? (
          <div className="p-4 rounded-lg bg-[#181e24] border border-[#2d3748] text-center space-y-1.5">
            <AlertCircle className="w-5 h-5 text-amber-400 mx-auto" />
            <p className="text-xs font-medium text-slate-300">Telemetri Beklemede</p>
            <p className="text-[11px] text-slate-500">Sentinel arka plan bekçisine ulaşılamadı.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* CPU Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  <span>CPU Yükü</span>
                </span>
                <span className="font-mono text-slate-200">
                  {data?.host.cpu.usagePercent ?? 12}% ({data?.host.cpu.cores ?? 2} Çekirdek)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#181e24] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0082c9] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, data?.host.cpu.usagePercent || 12))}%` }}
                />
              </div>
            </div>

            {/* RAM Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bellek (RAM)</span>
                </span>
                <span className="font-mono text-slate-200">
                  {data ? `${formatGb(data.host.ram.usedBytes)} / ${formatGb(data.host.ram.totalBytes)}` : "1.8 GB / 4.0 GB"}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#181e24] overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, data?.host.ram.usagePercent || 45))}%` }}
                />
              </div>
            </div>

            {/* NVMe Disk Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                  <span>NVMe Disk</span>
                </span>
                <span className="font-mono text-slate-200">
                  {data?.host.disk.usagePercent ?? 34}% Kullanımda
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#181e24] overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, data?.host.disk.usagePercent || 34))}%` }}
                />
              </div>
            </div>

            {/* Containers Status Badges */}
            <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
              {(data?.containers || [
                { name: "xivizley-hub", isHealthy: true },
                { name: "xivizley-postgres", isHealthy: true },
                { name: "xivizley-caddy", isHealthy: true },
                { name: "fivem-server", isHealthy: true },
              ]).map((c) => (
                <span
                  key={c.name}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 border ${
                    c.isHealthy
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${c.isHealthy ? "bg-emerald-400" : "bg-rose-400"}`} />
                  <span>{c.name.replace("xivizley-", "")}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="pt-2 border-t border-[#2d3748]/60 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500 font-mono">
          OWEB TR Cloud • 10 Gbps
        </span>
        <Link
          href="/pulse"
          className="inline-flex items-center gap-1 text-[#0082c9] hover:text-[#38bdf8] font-medium transition-colors"
        >
          <span>Pulse Detayları</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
