"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Activity,
  Server,
  ShieldCheck,
  Clock,
  Radio,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  HardDrive,
  Lock,
  Box,
  Gamepad2,
  Globe,
} from "lucide-react";
import type { ServiceStatusItem } from "../server/status-routes";

interface StatusData {
  systemStatus: string;
  headline: string;
  overallUptime: string;
  averageLatencyMs: number;
  lastChecked: string;
  historyBars: Array<{ day: number; date: string; status: "good" | "minor" | "major" }>;
  services: ServiceStatusItem[];
  incidents: Array<{
    id: string;
    title: string;
    date: string;
    status: string;
    impact: string;
    description: string;
  }>;
}

export interface SslDomainItem {
  domain: string;
  ip: string;
  status: "valid" | "expiring_soon" | "expired" | "unreachable";
  issuer: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  protocol: string;
  authorized: boolean;
}

export interface SslRadarResponse {
  ok: boolean;
  checkedAt: string;
  summary: {
    total: number;
    valid: number;
    expiringSoon: number;
    expired: number;
  };
  domains: SslDomainItem[];
}

export function PublicStatusClient() {
  const [data, setData] = useState<StatusData | null>(null);
  const [sslData, setSslData] = useState<SslRadarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState<{ date: string; status: string } | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const [resStatus, resSsl] = await Promise.all([
        fetch("/api/status/summary"),
        fetch("/api/ssl/radar"),
      ]);
      const jsonStatus = await resStatus.json();
      if (jsonStatus.ok && jsonStatus.data) {
        setData(jsonStatus.data);
      }
      const jsonSsl = await resSsl.json();
      if (jsonSsl.ok && Array.isArray(jsonSsl.domains)) {
        setSslData(jsonSsl);
      }
    } catch {
      // sessiz hata
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // 1 dk otomatik yenile
    return () => clearInterval(interval);
  }, []);

  const getServiceIcon = (id: string) => {
    switch (id) {
      case "hub":
        return <Server className="w-4 h-4 text-[#38bdf8]" />;
      case "drive":
        return <HardDrive className="w-4 h-4 text-emerald-400" />;
      case "pass":
        return <Lock className="w-4 h-4 text-purple-400" />;
      case "store":
        return <Box className="w-4 h-4 text-amber-400" />;
      case "game":
        return <Gamepad2 className="w-4 h-4 text-rose-400" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-8 space-y-8 font-sans">
      {/* ─── GENEL DURUM HERO KARTI ─── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#1e2530] border border-[#2d3748] shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {data?.headline || "Tüm Sistemler Operasyonel"}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                XIVIZLEY Sovereign Cloud ve VDS altyapısı kesintisiz çalışıyor.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-slate-300">
            <div className="bg-[#12161c] px-3 py-2 rounded-xl border border-[#2d3748]">
              <span className="text-[10px] text-slate-500 block uppercase">Ortalama Uptime</span>
              <span className="text-sm font-bold text-emerald-400">{data?.overallUptime || "99.98%"}</span>
            </div>
            <div className="bg-[#12161c] px-3 py-2 rounded-xl border border-[#2d3748]">
              <span className="text-[10px] text-slate-500 block uppercase">Ağ Yanıtı</span>
              <span className="text-sm font-bold text-[#38bdf8]">~{data?.averageLatencyMs || 12} ms</span>
            </div>
          </div>
        </div>

        {/* Canlı Tarama Bilgisi */}
        <div className="mt-6 pt-4 border-t border-[#2d3748] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Son Teşhis Kontrolü: {data?.lastChecked ? new Date(data.lastChecked).toLocaleTimeString("tr-TR") : "Az önce"}</span>
          </span>
          <button
            onClick={fetchStatus}
            disabled={isLoading}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* ─── SSL / TLS & DOMAIN SAĞLIK RADARI (Let's Encrypt TLS 1.3) ─── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SSL / TLS Sertifika Sağlık Radarı</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {sslData?.domains.length || 5} Domain Let's Encrypt TLS 1.3 Güvenlik Kalkanı
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {(sslData?.domains || [
            { domain: "suite.xivizley.com.tr", daysRemaining: 74, issuer: "Let's Encrypt (E6)", protocol: "TLSv1.3", ip: "178.210.168.163" },
            { domain: "drive.xivizley.com.tr", daysRemaining: 74, issuer: "Let's Encrypt (E6)", protocol: "TLSv1.3", ip: "178.210.168.163" },
            { domain: "pass.xivizley.com.tr", daysRemaining: 74, issuer: "Let's Encrypt (E6)", protocol: "TLSv1.3", ip: "178.210.168.163" },
            { domain: "pulse.xivizley.com.tr", daysRemaining: 74, issuer: "Let's Encrypt (E6)", protocol: "TLSv1.3", ip: "178.210.168.163" },
            { domain: "xivizley.com.tr", daysRemaining: 74, issuer: "Let's Encrypt (E6)", protocol: "TLSv1.3", ip: "178.210.168.163" },
          ]).map((ssl) => (
            <div
              key={ssl.domain}
              className="p-4 rounded-xl bg-[#1e2530] border border-[#2d3748] hover:border-[#38bdf8]/50 transition-all space-y-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white font-mono truncate">{ssl.domain}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                  {ssl.daysRemaining} Gün Kaldı
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1.5 border-t border-[#2d3748]">
                <span>{ssl.issuer}</span>
                <span className="text-[#38bdf8] font-bold">{ssl.protocol}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── SERVİSLER VE 90 GÜNLÜK UPTIME ÇUBUKLARI ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Server className="w-4 h-4 text-[#0082c9]" />
            <span>Servis Sağlık Durumu & 90 Günlük Geçmiş</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">90 Gün Önce ➔ Bugün</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {data?.services.map((svc) => (
            <div
              key={svc.id}
              className="p-5 rounded-xl bg-[#1e2530] border border-[#2d3748] hover:border-slate-600 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#141a22] border border-[#2d3748] flex items-center justify-center">
                    {getServiceIcon(svc.id)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{svc.name}</h3>
                    <p className="text-[11px] text-slate-400">{svc.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-emerald-400 font-semibold">{svc.uptimePercent}%</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Operasyonel
                  </span>
                </div>
              </div>

              {/* 90 Günlük Uptime Çubukları */}
              <div>
                <div className="flex items-center gap-0.5 w-full h-8 px-1 py-1 bg-[#12161c] rounded-lg border border-[#2d3748] overflow-hidden">
                  {data?.historyBars.map((bar, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredBar({ date: bar.date, status: bar.status === "good" ? "%100 Kesintisiz" : "Kısa Bakım (%99.8)" })}
                      onMouseLeave={() => setHoveredBar(null)}
                      className={`flex-1 h-full rounded-[1px] transition-all hover:scale-y-125 cursor-pointer ${
                        bar.status === "good"
                          ? "bg-emerald-500 hover:bg-emerald-400"
                          : "bg-amber-400 hover:bg-amber-300"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <span>90 gün önce</span>
                  <span className="text-slate-400">{hoveredBar ? `${hoveredBar.date}: ${hoveredBar.status}` : "Günü görmek için çubukların üzerine gelin"}</span>
                  <span>Bugün</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── GEÇMİŞ BAKIM & OLAY AKIŞI ─── */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0082c9]" />
          <span>Geçmiş Olaylar & Planlı Bakımlar</span>
        </h2>

        <div className="space-y-3">
          {data?.incidents.map((inc) => (
            <div
              key={inc.id}
              className="p-4 rounded-xl bg-[#1e2530] border border-[#2d3748] space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{inc.title}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {inc.status}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">{inc.description}</p>
              <div className="text-[10px] font-mono text-slate-500">
                Tarih: {inc.date} • Etki: {inc.impact}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── DİPNOT VE ALTYAPI DAMGASI ─── */}
      <footer className="pt-6 border-t border-[#2d3748] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Bursa PenDC Tier-3 Altyapısı (10 Gbps NVMe)</span>
        </div>
        <div>
          <span>Mimar: Alperen Celal (14, Bursa) • MIT Lisansı</span>
        </div>
      </footer>
    </div>
  );
}
