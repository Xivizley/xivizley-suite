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
    <div className="min-h-screen bg-[#08090e] text-slate-100 flex flex-col">
      {/* ─── Top Navbar ────────────────────────────────────────── */}
      <header className="border-b border-slate-800/80 bg-[#0e111a]/80 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 text-cyan-300 ring-1 ring-cyan-500/40 shadow-inner">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-cyan-400 opacity-20" />
            <Activity className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white">
                XIVIZLEY <span className="text-cyan-400 font-mono">PULSE</span>
              </span>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                UPTIME RADAR
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Canlı Sunucu & Konteyner Nabız Monitörü
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/status"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:border-slate-600 text-xs font-medium text-slate-300 transition-all active:scale-95"
          >
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <span>Halka Açık Durum Sayfası</span>
            <ExternalLink className="h-3 w-3 text-slate-500" />
          </a>

          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchMonitors(true);
            }}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
            title="Şimdi Yenile"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`}
            />
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Monitör Ekle</span>
          </button>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* ─── Bento Stat Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Global Status */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0e111a]/90 backdrop-blur-md p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Sistem Sağlığı
              </span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white tracking-tight">
                %{globalUptime}
              </span>
              <span className="text-xs font-bold text-emerald-400">Uptime</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Son 30 günlük ortalama</p>
          </div>

          {/* Card 2: Online / Offline Count */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0e111a]/90 backdrop-blur-md p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Aktif Servisler
              </span>
              <Server className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-cyan-300 tracking-tight">
                {onlineCount} / {totalMonitors}
              </span>
              <span className="text-xs font-medium text-slate-400">Online</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {totalMonitors - onlineCount === 0
                ? 'Tüm hedefler ayakta'
                : `${totalMonitors - onlineCount} servis ulaşılamıyor`}
            </p>
          </div>

          {/* Card 3: Avg Latency */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0e111a]/90 backdrop-blur-md p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Ortalama Gecikme
              </span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-300 font-mono tracking-tight">
                {avgLatency}
              </span>
              <span className="text-xs font-bold text-amber-400">ms</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Anlık ping yanıt süresi</p>
          </div>

          {/* Card 4: Incident Status */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0e111a]/90 backdrop-blur-md p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Olay & Alarm Durumu
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 tracking-tight">
                0
              </span>
              <span className="text-xs font-medium text-slate-400">Aktif Olay</span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-500/90 font-medium">
              Telegram alarmları aktif
            </p>
          </div>
        </div>

        {/* ─── Monitor Cards Section ───────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span>İzlenen Servisler ({monitors.length})</span>
            </h2>
            <span className="text-xs font-mono text-slate-500">
              30s Döngüsel Kontrol
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 rounded-3xl border border-slate-800 bg-[#0e111a]">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-cyan-400 mb-2" />
              <p className="text-xs font-medium">Nabız kontrolleri taranıyor...</p>
            </div>
          ) : monitors.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-slate-800 bg-[#0e111a] space-y-3">
              <Activity className="h-10 w-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-200">
                Henüz izlenen bir servis yok
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                İlk web sitenizi veya Minecraft/FiveM sunucunuzu ekleyerek gerçek zamanlı izlemeyi başlatın.
              </p>
              <button
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-500/30 transition-all"
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
                    className="group rounded-2xl border border-slate-800/90 bg-[#0e111a]/95 hover:border-slate-700/80 p-5 shadow-lg transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                            isUp
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
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
                            <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                              {mon.name}
                            </h3>
                            <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 uppercase">
                              {mon.type}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isUp
                                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-red-500/10 text-red-300 border border-red-500/30'
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 hover:border-cyan-500/40 text-xs font-semibold text-slate-300 hover:text-cyan-300 transition-all active:scale-95 disabled:opacity-50"
                          title="Anında Ping At"
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin text-cyan-400' : 'text-slate-400'}`}
                          />
                          <span>{isChecking ? 'Kontrol...' : 'Ping Test'}</span>
                        </button>

                        <button
                          onClick={() => handleDelete(mon.id)}
                          className="p-1.5 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-red-950/40 hover:text-red-400 hover:border-red-500/30 text-slate-500 transition-colors"
                          title="Monitörü Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Timeline Bars (Son 30 Kontrol) */}
                    <div className="mt-4 pt-3 border-t border-slate-800/60">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                        <span>Son 30 Kontrol (Geçmiş)</span>
                        <span>Şimdi</span>
                      </div>
                      <div className="flex items-center gap-1 overflow-x-auto py-1">
                        {mon.recentHeartbeats.map((hb, idx) => (
                          <div
                            key={hb.id || idx}
                            className={`flex-1 min-w-[6px] h-6 rounded-sm transition-all hover:scale-125 cursor-pointer ${
                              hb.status === 'up'
                                ? 'bg-emerald-500/75 hover:bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.3)]'
                                : 'bg-red-500 hover:bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#0e111a] shadow-2xl overflow-hidden text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-[#0e111a]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Yeni Monitör Ekle</h3>
                  <p className="text-[11px] text-slate-400">
                    Sunucunu veya web siteni anlık izlemeye al
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl border border-red-500/30 bg-red-950/30 text-xs text-red-300">
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
                  className="w-full rounded-xl border border-slate-800 bg-[#08090e] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40"
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
                    className="w-full rounded-xl border border-slate-800 bg-[#08090e] px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
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
                    className="w-full rounded-xl border border-slate-800 bg-[#08090e] px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
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
                  className="w-full rounded-xl border border-slate-800 bg-[#08090e] px-3.5 py-2.5 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {formData.type === 'http'
                    ? 'Tam site URL adresini girin (http:// veya https://)'
                    : 'Sunucu IP ve portunu araya iki nokta koyarak girin (Örn: 178.210.168.163:25565)'}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-slate-950 transition-all shadow-md active:scale-95 disabled:opacity-50"
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
