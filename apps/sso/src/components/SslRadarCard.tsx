"use client";

// ============================================================
// XIVIZLEY OpsCenter v1.1 — SSL / TLS & Let's Encrypt Radar Kartı
// Nextcloud Hub / Aurora UI Canlı Kriptografik Güvenlik Kalkanı
// Mimar: Alperen Celal (14, Bursa)
// ============================================================

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Lock,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

export interface SslDomainInfo {
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

export function SslRadarCard() {
  const [domains, setDomains] = useState<SslDomainInfo[]>([
    {
      domain: "suite.xivizley.com.tr",
      daysRemaining: 74,
      issuer: "Let's Encrypt",
      protocol: "TLSv1.3",
      ip: "178.210.168.163",
      status: "valid",
      validFrom: "",
      validTo: "",
      authorized: true,
    },
    {
      domain: "drive.xivizley.com.tr",
      daysRemaining: 74,
      issuer: "Let's Encrypt",
      protocol: "TLSv1.3",
      ip: "178.210.168.163",
      status: "valid",
      validFrom: "",
      validTo: "",
      authorized: true,
    },
    {
      domain: "pass.xivizley.com.tr",
      daysRemaining: 74,
      issuer: "Let's Encrypt",
      protocol: "TLSv1.3",
      ip: "178.210.168.163",
      status: "valid",
      validFrom: "",
      validTo: "",
      authorized: true,
    },
    {
      domain: "pulse.xivizley.com.tr",
      daysRemaining: 74,
      issuer: "Let's Encrypt",
      protocol: "TLSv1.3",
      ip: "178.210.168.163",
      status: "valid",
      validFrom: "",
      validTo: "",
      authorized: true,
    },
    {
      domain: "xivizley.com.tr",
      daysRemaining: 74,
      issuer: "Let's Encrypt",
      protocol: "TLSv1.3",
      ip: "178.210.168.163",
      status: "valid",
      validFrom: "",
      validTo: "",
      authorized: true,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchRadar = async (force = false) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ssl/radar${force ? "?refresh=true" : ""}`);
      const json = await res.json();
      if (json.ok && Array.isArray(json.domains)) {
        setDomains(json.domains);
        setLastUpdated(new Date().toLocaleTimeString("tr-TR"));
      }
    } catch (err) {
      console.error("SSL Radar verisi alınamadı:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRadar();
    const interval = setInterval(() => fetchRadar(), 5 * 60 * 1000); // 5 dk döngü
    return () => clearInterval(interval);
  }, []);

  const allValid = domains.every(
    (d) => d.status === "valid" || d.daysRemaining > 15,
  );

  return (
    <div className="rounded-2xl border border-[#2d3748] bg-[#222933] p-5 sm:p-6 shadow-xl space-y-4 font-sans">
      {/* ─── Başlık & Üst Bilgi ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2d3748] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                SSL / TLS Sertifika Sağlık Radarı
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Let's Encrypt TLS 1.3
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Bursa PenDC VDS alan adları anlık soket el sıkışması ve kalan
              geçerlilik süresi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {lastUpdated && (
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
              Güncelleme: {lastUpdated}
            </span>
          )}
          <button
            onClick={() => fetchRadar(true)}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#181e24] border border-[#2d3748] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Sertifikaları Yeniden Tara"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin text-[#0082c9]" : ""}`}
            />
          </button>
          <a
            href="/status"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-[#181e24] border border-[#2d3748] hover:border-slate-500 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <span>Durum Raporu</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      </div>

      {/* ─── Domain Rozetleri Izgarası ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {domains.map((ssl) => {
          const isExpired = ssl.status === "expired" || ssl.daysRemaining <= 0;
          const isExpiring =
            ssl.status === "expiring_soon" ||
            (ssl.daysRemaining > 0 && ssl.daysRemaining <= 15);
          const badgeClass = isExpired
            ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
            : isExpiring
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
          const iconClass = isExpired
            ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
            : isExpiring
              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

          return (
            <div
              key={ssl.domain}
              className="p-3 rounded-xl bg-[#181e24] border border-[#2d3748] hover:border-[#38bdf8]/40 transition-all flex flex-col justify-between space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between gap-1.5">
                <div
                  className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${iconClass}`}
                >
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border shrink-0 ${badgeClass}`}
                >
                  {isExpired
                    ? "Süresi Doldu"
                    : `${ssl.daysRemaining} Gün Kaldı`}
                </span>
              </div>

              <div>
                <span
                  className="text-xs font-bold text-white font-mono truncate block"
                  title={ssl.domain}
                >
                  {ssl.domain}
                </span>
                <span className="text-[10px] font-mono text-slate-500 truncate block">
                  {ssl.ip}
                </span>
              </div>

              <div className="pt-1.5 border-t border-[#2d3748] flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="truncate">
                  {ssl.issuer || "Let's Encrypt"}
                </span>
                <span className="text-[#38bdf8] font-bold shrink-0">
                  {ssl.protocol}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
