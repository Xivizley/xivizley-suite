"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Key,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Lock,
  RefreshCw,
  Search,
} from "lucide-react";

interface VaultItem {
  id: string;
  type: string;
  title: string;
  username?: string;
  password?: string;
  totpSecret?: string;
  isFavorite?: boolean;
}

export function VaultQuickWidget() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(30);

  // 30 saniyelik TOTP dinamik geri sayım döngüsü
  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setRemainingSeconds(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchVault = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/vault", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setItems(json.data.slice(0, 5));
        }
      }
    } catch {
      // Hata toleransı
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVault();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // SVG TOTP Dairesi
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - remainingSeconds / 30);
  const isCritical = remainingSeconds <= 3;
  const isWarning = remainingSeconds <= 7 && !isCritical;
  const strokeColor = isCritical
    ? "#f43f5e"
    : isWarning
      ? "#f59e0b"
      : "#10b981";
  const textColor = isCritical
    ? "text-rose-400"
    : isWarning
      ? "text-amber-400"
      : "text-emerald-400";

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.username && item.username.toLowerCase().includes(q))
    );
  });

  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#222933] p-5 flex flex-col justify-between space-y-4 shadow-sm">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                <span>Hızlı Kasa & 2FA</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </h3>
              <p className="text-[10px] text-slate-400">
                Sıfır bilgili parola yöneticisi
              </p>
            </div>
          </div>

          {/* 30s TOTP Circular Ring Widget */}
          <div className="flex items-center gap-1.5 bg-[#181e24] px-2 py-1 rounded-lg border border-[#2d3748]">
            <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r={radius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="3.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r={radius}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{
                    transition:
                      remainingSeconds >= 30
                        ? "none"
                        : "stroke-dashoffset 1s linear, stroke 0.3s ease",
                  }}
                />
              </svg>
              <span
                className={`absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold ${textColor}`}
              >
                {remainingSeconds}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">2FA</span>
          </div>
        </div>

        {/* Items List */}
        {isLoading && items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <div className="w-5 h-5 border-2 border-[#0082c9] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Kasa verileri yükleniyor...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 text-center rounded-lg border border-dashed border-[#3b4758] bg-[#181e24] p-4">
            <Lock className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-300">
              Henüz parola eklenmedi
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Parola veya 2FA eklemek için Kasayı açın.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2d3748]/60">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between gap-3 group hover:bg-[#2b3442]/40 rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate group-hover:text-white flex items-center gap-1.5">
                    <span>{item.title}</span>
                    {item.totpSecret && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                        2FA
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    {item.username || "Kullanıcı adı yok"}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {item.password && (
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(item.password!, `pass-${item.id}`)
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181e24] transition-colors"
                      title="Parolayı Kopyala"
                      aria-label="Parolayı Kopyala"
                    >
                      {copiedKey === `pass-${item.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  {item.totpSecret && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(
                            `/api/vault/${item.id}/totp`,
                            { credentials: "include" },
                          );
                          if (res.ok) {
                            const json = await res.json();
                            if (json.data?.code) {
                              copyToClipboard(
                                json.data.code,
                                `totp-${item.id}`,
                              );
                            }
                          }
                        } catch {}
                      }}
                      className="px-2 py-1 rounded-lg bg-[#181e24] border border-[#2d3748] hover:border-amber-400/50 text-[10px] font-mono text-amber-300 transition-colors flex items-center gap-1"
                      title="2FA Kodunu Kopyala"
                    >
                      {copiedKey === `totp-${item.id}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <span>2FA Kopyala</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="pt-2 border-t border-[#2d3748]/60 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500 font-mono">
          {items.length} parola kayıtlı
        </span>
        <Link
          href="/pass"
          className="inline-flex items-center gap-1 text-[#0082c9] hover:text-[#38bdf8] font-medium transition-colors"
        >
          <span>Kasayı Aç</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
