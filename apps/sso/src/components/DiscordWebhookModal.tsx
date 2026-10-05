"use client";

// ============================================================
// XIVIZLEY Suite — Discord Webhook Alarm Konfigürasyon Modalı
// Çok kanallı anlık VDS bildirimleri & zengin Discord Embeds testi
// ============================================================

import React, { useState, useEffect } from "react";
import {
  Bell,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";

interface DiscordWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiscordWebhookModal({ isOpen, onClose }: DiscordWebhookModalProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [maskedUrl, setMaskedUrl] = useState<string | null>(null);
  const [hasWebhook, setHasWebhook] = useState(false);
  const [discordEnabled, setDiscordEnabled] = useState(true);
  const [debounceMinutes, setDebounceMinutes] = useState(30);

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications/config");
      const json = await res.json();
      if (json.ok && json.data) {
        setMaskedUrl(json.data.webhookUrl);
        setHasWebhook(json.data.hasWebhook);
        setDiscordEnabled(json.data.discordEnabled);
        setDebounceMinutes(json.data.debounceMinutes || 30);
      }
    } catch (err) {
      console.error("Bildirim ayarları alınamadı:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      setTestResult(null);
      setSaveResult(null);
      setWebhookUrl("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAlert = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/notifications/test-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() || undefined }),
      });
      const data = await res.json();
      setTestResult({
        ok: res.ok && data.ok,
        message: data.message || (res.ok ? "Discord test alarmı başarıyla gönderildi!" : "Gönderim başarısız."),
      });
      if (res.ok && data.ok) {
        fetchConfig();
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || "Ağ hatası: Test alarmı gönderilemedi.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/notifications/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordWebhookUrl: webhookUrl.trim() ? webhookUrl.trim() : undefined,
          discordEnabled,
          debounceMinutes: Number(debounceMinutes) || 30,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaveResult({ ok: true, message: "Discord alarm ayarları başarıyla kaydedildi." });
        setWebhookUrl("");
        fetchConfig();
      } else {
        setSaveResult({ ok: false, message: data.message || "Kaydetme başarısız oldu." });
      }
    } catch (err: any) {
      setSaveResult({ ok: false, message: err.message || "Ağ hatası: Ayarlar kaydedilemedi." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#222933] border border-[#2d3748] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Başlığı */}
        <div className="px-6 py-4 border-b border-[#2d3748] flex items-center justify-between bg-[#181e24]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Discord Akıllı Alarm Motoru
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30">
                  OpsCenter v1.1
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Bursa PenDC VDS arızaları ve RAM/CPU darboğazlarını Discord kanalınıza iletin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form İçeriği */}
        <form onSubmit={handleSaveConfig} className="p-6 space-y-5">
          {/* Durum Rozeti */}
          <div className="p-3.5 rounded-xl bg-[#181e24] border border-[#2d3748] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  hasWebhook && discordEnabled
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-amber-400"
                }`}
              />
              <span className="text-xs font-semibold text-slate-300">
                {hasWebhook
                  ? discordEnabled
                    ? "Kanal Bağlı & Aktif Dinlemede"
                    : "Webhook Tanımlı (Devre Dışı)"
                  : "Webhook Henüz Yapılandırılmadı"}
              </span>
            </div>
            {maskedUrl && (
              <span className="text-[10px] font-mono text-slate-400 max-w-[180px] truncate">
                {maskedUrl}
              </span>
            )}
          </div>

          {/* Webhook URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Discord Webhook URL</span>
              <a
                href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#0082c9] hover:underline flex items-center gap-1 font-normal"
              >
                Nasıl alınır? <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder={maskedUrl || "https://discord.com/api/webhooks/..."}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#181e24] border border-[#2d3748] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#0082c9] transition-colors"
            />
            <p className="text-[11px] text-slate-400">
              Kanal ayarları ➔ Entegrasyonlar ➔ Webhook Oluştur adımından bağlantıyı kopyalayabilirsiniz.
            </p>
          </div>

          {/* Eşik ve Sessizlik Süresi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Cooldown (Sessizlik)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={debounceMinutes}
                  onChange={(e) => setDebounceMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#181e24] border border-[#2d3748] text-xs font-mono text-white focus:outline-none focus:border-[#0082c9]"
                />
                <span className="text-xs font-mono text-slate-400 shrink-0">dakika</span>
              </div>
              <p className="text-[10px] text-slate-500">Tekrarlayan arızalar için sessizlik penceresi.</p>
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#181e24] border border-[#2d3748] cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="checkbox"
                  checked={discordEnabled}
                  onChange={(e) => setDiscordEnabled(e.target.checked)}
                  className="rounded border-[#2d3748] text-[#0082c9] focus:ring-0 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-300">
                  Discord Alarmlarını Etkinleştir
                </span>
              </label>
            </div>
          </div>

          {/* Zengin Embed Önizleme Bilgisi */}
          <div className="p-3 rounded-xl bg-[#181e24]/70 border border-[#2d3748]/70 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Otomatik Embed Renk Kodlaması:</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
              <span className="px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-center">
                🟢 Toparlanma (#22c55e)
              </span>
              <span className="px-2 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-center">
                🟡 Yüksek RAM/CPU (#eab308)
              </span>
              <span className="px-2 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-center">
                🔴 Konteyner Arızası (#ef4444)
              </span>
            </div>
          </div>

          {/* Test & Kaydet Sonuç Bildirimi */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.ok
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/15 border-rose-500/30 text-rose-300"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {saveResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                saveResult.ok
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/15 border-rose-500/30 text-rose-300"
              }`}
            >
              {saveResult.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{saveResult.message}</span>
            </div>
          )}

          {/* Aksiyon Butonları */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#2d3748]">
            <button
              type="button"
              onClick={handleTestAlert}
              disabled={isTesting || (!webhookUrl && !hasWebhook)}
              className="px-3.5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Send className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
              <span>{isTesting ? "Gönderiliyor..." : "Test Alarmı Gönder"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors"
              >
                Kapat
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Kaydediliyor..." : "Kaydet"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
