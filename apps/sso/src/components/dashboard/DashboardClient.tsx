"use client";

import React, { useState, useEffect } from "react";
import { NextcloudHeader } from "@xivizley/aurora-ui";
import { DashboardHeaderHero } from "./DashboardHeaderHero";
import { RecentFilesWidget } from "./RecentFilesWidget";
import { StickyNoteWidget } from "./StickyNoteWidget";
import { SentinelRadarWidget } from "./SentinelRadarWidget";
import { VaultQuickWidget } from "./VaultQuickWidget";
import { GameCockpitWidget } from "./GameCockpitWidget";
import { SuiteAppsWidget } from "./SuiteAppsWidget";
import { DashboardCustomizeModal, type DashboardConfig } from "./DashboardCustomizeModal";
import { Server, CheckCircle2, Clock } from "lucide-react";

const DEFAULT_CONFIG: DashboardConfig = {
  widgets: ["hero", "recentFiles", "stickyNote", "sentinel", "vault", "game", "apps"],
  theme: "system",
};

export function DashboardClient({
  initialUser,
  initialConfig,
}: {
  initialUser?: { displayName: string; email: string; role?: string } | null;
  initialConfig?: DashboardConfig | null;
}) {
  const [user, setUser] = useState(initialUser || { displayName: "Alperen", email: "alperen@xivizley.com.tr" });
  const [config, setConfig] = useState<DashboardConfig>(initialConfig || DEFAULT_CONFIG);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  // Kullanıcı ve tercihleri backend'den güncelle
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.ok && json.data) {
          setUser(json.data);
        }
      })
      .catch(() => {});

    fetch("/api/user/preferences", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.ok && json.data) {
          setConfig(json.data);
        }
      })
      .catch(() => {});

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("customize") === "true") {
        setIsCustomizeOpen(true);
      }
    }
  }, []);

  // Header menüsünden özelleştirme modalını dinle
  useEffect(() => {
    const handleOpenCustomize = () => setIsCustomizeOpen(true);
    window.addEventListener("xivizley:open-customize", handleOpenCustomize);
    return () => {
      window.removeEventListener("xivizley:open-customize", handleOpenCustomize);
    };
  }, []);

  const handleSavePreferences = async (newConfig: DashboardConfig) => {
    setConfig(newConfig);
    try {
      await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newConfig),
      });
    } catch {}
  };

  const isVisible = (widgetId: string) => config.widgets.includes(widgetId);

  return (
    <div className="min-h-screen bg-[#181e24] text-slate-100 flex flex-col font-sans">
      {/* ─── Signature Nextcloud Header Bar ─────────────────── */}
      <NextcloudHeader activeApp="hub" title="Hub Dashboard" />

      {/* ─── Main Hub Content ───────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Widget 1: Time-Aware Hero Banner */}
        {isVisible("hero") && (
          <DashboardHeaderHero
            displayName={user?.displayName || "Alperen"}
            onOpenCustomize={() => setIsCustomizeOpen(true)}
          />
        )}

        {/* ─── Live Widgets 2-Column Responsive Grid ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Sol Kolon: Dosyalar & Notlar */}
          <div className="space-y-6">
            {isVisible("recentFiles") && <RecentFilesWidget />}
            {isVisible("stickyNote") && <StickyNoteWidget />}
          </div>

          {/* Sağ Kolon: Telemetri, Kasa TOTP, Oyun Kokpiti */}
          <div className="space-y-6">
            {isVisible("sentinel") && <SentinelRadarWidget />}
            {isVisible("vault") && <VaultQuickWidget />}
            {isVisible("game") && <GameCockpitWidget />}
          </div>
        </div>

        {/* Widget 7: Tüm Uygulamalar Başlatıcısı */}
        {isVisible("apps") && <SuiteAppsWidget />}

        {/* ─── VDS System Status Footer Card ──────────────────── */}
        <div className="rounded-xl border border-[#2d3748] bg-[#1a202c] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#222933] flex items-center justify-center border border-[#2d3748] text-[#0082c9]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-slate-200">XIVIZLEY Enterprise Homelab Engine</p>
              <p className="text-slate-400 text-[11px]">
                OWEB TR 10 Gbps NVMe • Docker Engine Native • Nextcloud Hub 9 Standartları
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Veritabanı: PostgreSQL 16</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Yedekleme: 03:00 Otomatik</span>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Customize Dashboard Modal Drawer ───────────────── */}
      <DashboardCustomizeModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        config={config}
        onSave={handleSavePreferences}
      />
    </div>
  );
}
