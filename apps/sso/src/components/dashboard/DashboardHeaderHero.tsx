"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  HardDrive,
  FileText,
  ShoppingBag,
  Sliders,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

interface DashboardHeaderHeroProps {
  displayName?: string;
  onOpenCustomize?: () => void;
}

export function DashboardHeaderHero({
  displayName = "Alperen",
  onOpenCustomize,
}: DashboardHeaderHeroProps) {
  const [greeting, setGreeting] = useState("Hoş Geldiniz");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting("Günaydın");
      } else if (hour >= 12 && hour < 18) {
        setGreeting("İyi günler");
      } else if (hour >= 18 && hour < 23) {
        setGreeting("İyi akşamlar");
      } else {
        setGreeting("İyi geceler");
      }

      setCurrentTime(
        now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#222933] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            XIVIZLEY Cloud Hub • Operasyonel
          </span>
          {currentTime && (
            <span className="text-xs font-mono text-slate-400 ml-1">
              • {currentTime}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>{greeting}, {displayName}</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
          Tüm kişisel bulut araçlarınız, dosyalarınız, notlarınız, 2FA parolalarınız ve sunucu kontrolleriniz tek çatı altında devrede.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenCustomize}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#181e24] hover:bg-[#2b3442] text-slate-200 text-xs font-medium border border-[#2d3748] transition-colors"
          title="Paneli Özelleştir"
        >
          <Sliders className="w-3.5 h-3.5 text-[#0082c9]" />
          <span>Paneli Özelleştir</span>
        </button>

        <Link
          href="/files"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Dosyalar</span>
        </Link>

        <Link
          href="/store"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#2b3442] hover:bg-[#343e4f] text-slate-200 text-xs font-medium border border-[#3b4758] transition-colors"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-sky-400" />
          <span>Mağaza</span>
        </Link>
      </div>
    </div>
  );
}
