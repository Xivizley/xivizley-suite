"use client";

import React, { useState } from "react";
import {
  Sliders,
  X,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Palette,
  LayoutGrid,
} from "lucide-react";

export interface DashboardConfig {
  widgets: string[];
  theme: string;
}

interface DashboardCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DashboardConfig;
  onSave: (newConfig: DashboardConfig) => Promise<void>;
}

const AVAILABLE_WIDGETS = [
  {
    id: "hero",
    label: "Karşılama & Durum Hero Başlığı",
    desc: "Zaman farkındalı karşılama, operasyonel durum ve kısayollar",
  },
  {
    id: "recentFiles",
    label: "Son Dosyalar (Drive)",
    desc: "En son kullanılan dosyalar, dosya tipi ikonları ve hızlı yükleme alanı",
  },
  {
    id: "stickyNote",
    label: "Hızlı Yapışkan Not",
    desc: "Otomatik kaydedilen scratchpad notu, Notlar uygulaması ile senkronize",
  },
  {
    id: "sentinel",
    label: "VDS Sentinel Telemetrisi",
    desc: "Canlı CPU, RAM, NVMe disk barları ve konteyner bekçisi",
  },
  {
    id: "vault",
    label: "Hızlı Kasa & 2FA TOTP",
    desc: "Kayıtlı parolalar ve 30 saniyelik animasyonlu 2FA TOTP sayacı",
  },
  {
    id: "game",
    label: "Oyun Sunucusu Kokpiti",
    desc: "FiveM & Minecraft sunucu durumu, oyuncular ve RAM takibi",
  },
  {
    id: "apps",
    label: "Bulut Uygulamaları Başlatıcısı",
    desc: "Tüm XIVIZLEY Suite uygulamalarına hızlı erişim butonları",
  },
];

const THEMES = [
  {
    id: "system",
    label: "Sistem Varsayılanı (Otomatik)",
    desc: "Tarayıcı ve işletim sistemi tercihini takip eder",
  },
  {
    id: "aurora",
    label: "XIVIZLEY Mavi (#0082c9)",
    desc: "XIVIZLEY homelab imza mavisi",
  },
  {
    id: "dark",
    label: "Koyu Homelab (#181e24)",
    desc: "Düşük ışıklı ortamlara uygun koyu homelab arayüzü",
  },
];

export function DashboardCustomizeModal({
  isOpen,
  onClose,
  config,
  onSave,
}: DashboardCustomizeModalProps) {
  const [widgets, setWidgets] = useState<string[]>(config.widgets || []);
  const [theme, setTheme] = useState<string>(config.theme || "system");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const toggleWidget = (widgetId: string) => {
    setWidgets((prev) =>
      prev.includes(widgetId)
        ? prev.filter((id) => id !== widgetId)
        : [...prev, widgetId],
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave({ widgets, theme });
      onClose();
    } catch {
      // Hata
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#1e2530] border border-[#2d3748] rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#2d3748] bg-[#181e24] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0082c9]/20 text-[#0082c9] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Paneli Özelleştir
              </h2>
              <p className="text-[11px] text-slate-400">
                Kişisel Hub kontrol panelinizi ve bileşenlerinizi yapılandırın
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2b3442] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Section 1: Widgets Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-[#38bdf8]">
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Görünür Panel Bileşenleri</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {widgets.length} / {AVAILABLE_WIDGETS.length} Seçili
              </span>
            </div>

            <div className="space-y-2">
              {AVAILABLE_WIDGETS.map((w) => {
                const isChecked = widgets.includes(w.id);
                return (
                  <div
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isChecked
                        ? "bg-[#181e24] border-[#0082c9]/60 shadow-sm"
                        : "bg-[#141a22] border-[#2d3748] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-200">{w.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {w.desc}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {isChecked ? (
                        <div className="w-6 h-6 rounded-md bg-[#0082c9] text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-[#2b3442] border border-[#3b4758] flex items-center justify-center text-slate-500">
                          <EyeOff className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Theme Selector */}
          <div className="space-y-3 pt-3 border-t border-[#2d3748]">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-[#38bdf8]">
              <Palette className="w-3.5 h-3.5" />
              <span>Görsel Tema Seçimi</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    theme === t.id
                      ? "bg-[#181e24] border-[#0082c9] ring-1 ring-[#0082c9]"
                      : "bg-[#141a22] border-[#2d3748] hover:border-slate-500"
                  }`}
                >
                  <p className="font-semibold text-slate-200">{t.label}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#141a22] border-t border-[#2d3748] flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-mono">
            Ayarlar hesabınızda PostgreSQL&apos;de saklanır
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-[#222933] hover:bg-[#2b3442] text-slate-300 font-medium transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? "Kaydediliyor..." : "Tercihleri Kaydet"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
