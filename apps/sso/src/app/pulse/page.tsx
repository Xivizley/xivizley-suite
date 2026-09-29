'use client';

// ============================================================
// XIVIZLEY Pulse — Main Dashboard (Aurora Night Uptime Center)
// Real-time server heartbeat monitor, latency graphs & incident tracking
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Plus,
  RefreshCw,
  Globe,
  Radio,
  Server,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { PulseMonitor } from '@/server/services/pulseService';
import { NextcloudHeader } from '@xivizley/aurora-ui';

export default function PulseDashboard() {
  const [monitors, setMonitors] = useState<PulseMonitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'http' as 'http' | 'tcp',
    target: '',
    intervalSeconds: 30,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchMonitors = async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const res = await fetch('/api/monitors');
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        setMonitors(data.data);
      }
    } catch (err) {
      console.error('Monitörler alınamadı', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
    // 30 saniyede bir otomatik yenile
    const timer = setInterval(() => fetchMonitors(true), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleManualCheck = async (id: string) => {
    setCheckingId(id);
    try {
      const res = await fetch(`/api/monitors/${id}/check`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        await fetchMonitors(true);
      }
    } catch (err) {
      console.error('Ping hatası', err);
    } finally {
      setCheckingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu monitörü silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
      setMonitors((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Silme hatası', err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.target.trim()) {
      setFormError('Lütfen servis adı ve hedef adresini girin.');
      return;
    }
    setFormSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.ok) {
        setIsAddOpen(false);
        setFormData({ name: '', type: 'http', target: '', intervalSeconds: 30 });
        await fetchMonitors();
      } else {
        setFormError(data.error || 'Monitör oluşturulamadı.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Bağlantı hatası.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Hesaplanan Özet İstatistikler
  const totalMonitors = monitors.length;
  const onlineCount = monitors.filter((m) => m.status === 'up').length;
  const globalUptime =
    totalMonitors > 0
      ? (
          monitors.reduce((acc, m) => acc + (m.uptimePercentage || 100), 0) /
          totalMonitors
        ).toFixed(2)
      : '100.00';
  const avgLatency =
    totalMonitors > 0
      ? Math.round(
          monitors.reduce((acc, m) => acc + (m.lastLatencyMs || 0), 0) /
            totalMonitors
        )
      : 0;

  return (
    <div className="min-h-screen bg-[#181e24] text-slate-100 flex flex-col font-sans">
      {/* ─── Signature Nextcloud Header Bar ─────────────────── */}
      <NextcloudHeader
        activeApp="pulse"
        title="Sistem İzleme"
        rightActions={
          <div className="flex items-center gap-2">
            <a
              href="/status"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Durum Sayfası</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>

            <button
              onClick={() => {
                setIsRefreshing(true);
                fetchMonitors(true);
              }}
              className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
              title="Şimdi Yenile"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>

            <button
              onClick={() => setIsAddOpen(true)}
              className="h-7 px-3 rounded-md bg-white text-[#0082c9] hover:bg-white/90 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Yeni Monitör</span>
            </button>
          </div>
        }
      />

      {/* ─── Main Content ───────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ─── Nextcloud Metric Cards ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Global Status */}
          <div className="rounded-xl border border-[#2d3748] bg-[#222933] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Sistem Sağlığı
              </span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-100 tracking-tight">
                %{globalUptime}
              </span>
              <span className="text-xs font-medium text-emerald-400">Uptime</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Son 30 günlük ortalama</p>
          </div>

          {/* Card 2: Online / Offline Count */}
          <div className="rounded-xl border border-[#2d3748] bg-[#222933] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Aktif Servisler
              </span>
              <Server className="h-4 w-4 text-[#0082c9]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-100 tracking-tight">
                {onlineCount} / {totalMonitors}
              </span>
              <span className="text-xs font-medium text-slate-400">Online</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {totalMonitors - onlineCount === 0
                ? 'Tüm hedefler ayakta'
                : `${totalMonitors - onlineCount} servis ulaşılamıyor`}
            </p>
          </div>

          {/* Card 3: Avg Latency */}
          <div className="rounded-xl border border-[#2d3748] bg-[#222933] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Ortalama Gecikme
              </span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-100 font-mono tracking-tight">
                {avgLatency}
              </span>
              <span className="text-xs font-medium text-amber-400">ms</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Anlık ping yanıt süresi</p>
          </div>

          {/* Card 4: Incident Status */}
          <div className="rounded-xl border border-[#2d3748] bg-[#222933] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Olay & Alarm Durumu
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400 tracking-tight">
                0
              </span>
              <span className="text-xs font-medium text-slate-400">Aktif Olay</span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-400/90 font-medium">
              Telegram bildirimleri aktif
            </p>
          </div>
        </div>

        {/* ─── Monitor Cards Section ───────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Radio className="h-4 w-4 text-[#0082c9]" />
              <span>İzlenen Servisler ({monitors.length})</span>
            </h2>
            <span className="text-xs font-mono text-slate-500">
              30s Döngüsel Kontrol
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 rounded-xl border border-[#2d3748] bg-[#222933]">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#0082c9] mb-2" />
              <p className="text-xs font-medium">Servis durumları taranıyor...</p>
            </div>
          ) : monitors.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-[#2d3748] bg-[#222933] space-y-3">
              <Activity className="h-10 w-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-semibold text-slate-200">
                Henüz izlenen bir servis yok
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                İlk web sitenizi veya sunucu servisinizi ekleyerek gerçek zamanlı izlemeyi başlatın.
              </p>
              <button
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>İlk Servisi Ekle</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {monitors.map((mon) => {
                const isUp = mon.status === 'up';
                const isChecking = checkingId === mon.id;

                return (
                  <div
                    key={mon.id}
                    className="group rounded-xl border border-[#2d3748] bg-[#222933] hover:border-slate-500 p-4 shadow-sm transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${
                            isUp
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isUp ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-100 group-hover:text-[#0082c9] transition-colors">
                              {mon.name}
                            </h3>
                            <span className="rounded bg-[#181e24] px-1.5 py-0.5 text-[10px] font-mono text-slate-400 uppercase border border-[#2d3748]">
                              {mon.type}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isUp
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {isUp ? 'OPERASYONEL' : 'ULAŞILAMIYOR'}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-400 font-mono">
                            <span className="hover:underline cursor-pointer truncate max-w-xs sm:max-w-md">
                              {mon.target}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-300">
                              <Zap className="h-3 w-3 text-amber-400" />
                              <strong>{mon.lastLatencyMs ?? 0}</strong> ms
                            </span>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">
                              %{mon.uptimePercentage.toFixed(1)} Uptime
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => handleManualCheck(mon.id)}
                          disabled={isChecking}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2d3748] bg-[#181e24] hover:bg-[#2b3442] text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
                          title="Anında Ping At"
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin text-[#0082c9]' : 'text-slate-400'}`}
                          />
                          <span>{isChecking ? 'Kontrol...' : 'Ping Test'}</span>
                        </button>

                        <button
                          onClick={() => handleDelete(mon.id)}
                          className="p-1.5 rounded-lg border border-[#2d3748] bg-[#181e24] hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 text-slate-400 transition-colors"
                          title="Monitörü Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Timeline Bars (Son 30 Kontrol) */}
                    <div className="mt-4 pt-3 border-t border-[#2d3748]">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                        <span>Son 30 Kontrol (Geçmiş)</span>
                        <span>Şimdi</span>
                      </div>
                      <div className="flex items-center gap-1 overflow-x-auto py-1">
                        {mon.recentHeartbeats.map((hb, idx) => (
                          <div
                            key={hb.id || idx}
                            className={`flex-1 min-w-[6px] h-6 rounded-sm transition-all hover:scale-125 cursor-pointer ${
                              hb.status === 'up'
                                ? 'bg-emerald-500/80 hover:bg-emerald-400'
                                : 'bg-rose-500 hover:bg-rose-400'
                            }`}
                            title={`${hb.status === 'up' ? 'Online' : 'Offline'} — ${hb.latencyMs} ms`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ─── Add Monitor Modal ─────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-[#2d3748] bg-[#222933] shadow-2xl overflow-hidden text-slate-100">
            <div className="flex items-center justify-between border-b border-[#2d3748] px-6 py-4 bg-[#181e24]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0082c9]/10 text-[#0082c9] border border-[#0082c9]/20">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Yeni Monitör Ekle</h3>
                  <p className="text-[11px] text-slate-400">
                    Sunucunu veya web siteni anlık izlemeye al
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#2b3442] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-950/30 text-xs text-rose-300">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Servis Adı
                </label>
                <input
                  type="text"
                  placeholder="Örn: Minecraft PaperMC veya Jellyfin"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#2d3748] bg-[#181e24] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#0082c9]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    İzleme Türü
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as 'http' | 'tcp',
                      })
                    }
                    className="w-full rounded-lg border border-[#2d3748] bg-[#181e24] px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#0082c9]"
                  >
                    <option value="http">🌐 HTTP / HTTPS Web</option>
                    <option value="tcp">⚡ TCP Port (Minecraft/FiveM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Kontrol Sıklığı
                  </label>
                  <select
                    value={formData.intervalSeconds}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        intervalSeconds: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-[#2d3748] bg-[#181e24] px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#0082c9]"
                  >
                    <option value="30">Her 30 Saniyede Bir</option>
                    <option value="60">Her 1 Dakikada Bir</option>
                    <option value="300">Her 5 Dakikada Bir</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Hedef Adres
                </label>
                <input
                  type="text"
                  placeholder={
                    formData.type === 'http'
                      ? 'https://xivizley.com.tr'
                      : '178.210.168.163:25565'
                  }
                  value={formData.target}
                  onChange={(e) =>
                    setFormData({ ...formData, target: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#2d3748] bg-[#181e24] px-3.5 py-2.5 text-xs font-mono text-[#0082c9] placeholder-slate-500 focus:outline-none focus:border-[#0082c9]"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  {formData.type === 'http'
                    ? 'Tam site URL adresini girin (http:// veya https://)'
                    : 'Sunucu IP ve portunu araya iki nokta koyarak girin (Örn: 178.210.168.163:25565)'}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-[#181e24] transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-xs font-semibold text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>{formSubmitting ? 'Kaydediliyor...' : 'Monitörü Başlat'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
