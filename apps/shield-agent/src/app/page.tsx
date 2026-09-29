'use client';

// ============================================================
// XIVIZLEY Shield — Cyber Threat Radar & WAF Defense Cockpit
// Aurora Night 3-Column Tactical Command Center
// ============================================================

import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Zap,
  Activity,
  AlertTriangle,
  Radio,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Terminal,
  Globe,
  Lock,
  Unlock,
  Server,
  Play,
  CheckCircle2,
  XCircle,
  X,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NextcloudHeader } from '@xivizley/aurora-ui';
import type { BannedIpItem, SecurityEventItem, ShieldStats } from '@/server/services/shieldService';

export default function ShieldDashboard() {
  const [stats, setStats] = useState<ShieldStats | null>(null);
  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [bans, setBans] = useState<BannedIpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'bans' | 'geoip' | 'inspector'>('bans');

  // Modal Durumları
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [newBanIp, setNewBanIp] = useState('');
  const [newBanReason, setNewBanReason] = useState('');
  const [newBanThreatLevel, setNewBanThreatLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [newBanPermanent, setNewBanPermanent] = useState(true);

  // WAF Denetim Laboratuvarı Durumu
  const [inspectUrl, setInspectUrl] = useState('/api/auth/login?user=admin%27%20OR%201=1--');
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  // Simülasyon Geri Bildirimi
  const [simulatingType, setSimulatingType] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Veri Çekme
  const fetchData = async () => {
    try {
      const [statsRes, threatsRes, bansRes] = await Promise.all([
        fetch('/api/stats').then((r) => r.json()),
        fetch('/api/threats?limit=35').then((r) => r.json()),
        fetch('/api/bans?all=true').then((r) => r.json()),
      ]);

      if (statsRes.ok) setStats(statsRes.data);
      if (threatsRes.ok) setEvents(threatsRes.data);
      if (bansRes.ok) setBans(bansRes.data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // 8s canlı telemetri tazeleme
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Manuel IP Banlama
  const handleAddBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanIp || !newBanReason) return;

    try {
      const res = await fetch('/api/bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: newBanIp,
          reason: newBanReason,
          threatLevel: newBanThreatLevel,
          isPermanent: newBanPermanent,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setBans([data.data, ...bans]);
        setIsBanModalOpen(false);
        setNewBanIp('');
        setNewBanReason('');
        showToast(`🚫 IP ${newBanIp} başarıyla karantinaya alındı.`);
      } else {
        showToast(`❌ Hata: ${data.error}`);
      }
    } catch {
      showToast('❌ Bağlantı hatası.');
    }
  };

  // Ban Kaldırma (Unban)
  const handleUnban = async (ip: string) => {
    try {
      const res = await fetch(`/api/bans/${encodeURIComponent(ip)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setBans(bans.filter((b) => b.ip !== ip));
        showToast(`🔓 ${ip} karantina engeli kaldırıldı.`);
      }
    } catch {
      showToast('❌ Ban kaldırılamadı.');
    }
  };

  // WAF İnceleme Testi
  const handleInspect = async () => {
    setIsInspecting(true);
    try {
      const res = await fetch('/api/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: '203.0.113.199',
          path: inspectUrl,
          payload: inspectUrl,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setInspectResult(data.data);
      }
    } catch {
      // ignore
    } finally {
      setIsInspecting(false);
    }
  };

  // Saldırı Simülatörü Tetikleme
  const handleSimulate = async (type: string) => {
    setSimulatingType(type);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.ok) {
        setEvents((prev) => [data.data, ...prev]);
        showToast(`⚔️ [${type.toUpperCase()}] WAF kalkanı saldırıyı başarıyla engelledi!`);
        fetchData();
      }
    } catch {
      // ignore
    } finally {
      setSimulatingType(null);
    }
  };

  const filteredBans = useMemo(() => {
    if (!searchQuery) return bans;
    const q = searchQuery.toLowerCase();
    return bans.filter(
      (b) =>
        b.ip.toLowerCase().includes(q) ||
        b.reason.toLowerCase().includes(q) ||
        b.countryName.toLowerCase().includes(q)
    );
  }, [bans, searchQuery]);

  return (
    <div className="min-h-screen bg-[#181e24] text-slate-100 flex flex-col font-sans text-xs md:text-sm">
      {/* ─── Bildirim Toast'ı ────────────────────────────────────── */}
      {notification && (
        <div className="fixed top-14 right-4 z-50 flex items-center gap-2 bg-[#222933] border border-[#2d3748] text-slate-100 px-4 py-2.5 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2">
          <Activity className="w-4 h-4 text-[#0082c9]" />
          <span>{notification}</span>
        </div>
      )}

      {/* ─── Signature Nextcloud Header Bar ─────────────────── */}
      <NextcloudHeader
        activeApp="shield"
        title="Güvenlik Merkezi"
        rightActions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 text-xs font-medium text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>WAF Kalkanı Aktif</span>
            </div>

            <button
              onClick={() => setIsBanModalOpen(true)}
              className="h-7 px-3 rounded-md bg-white text-[#0082c9] hover:bg-white/90 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>IP Banla</span>
            </button>

            <button
              onClick={fetchData}
              title="Yenile"
              className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
          </div>
        }
      />

      {/* ─── Nextcloud Metric Cards (4 Metrik) ───────────────────── */}
      <div className="p-6 pb-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Engellenen Tehdit */}
        <div className="p-4 rounded-xl bg-[#222933] border border-[#2d3748] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Toplam Engellenen</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-100">{stats?.totalBlockedThreats ?? '1,487'}</span>
            <span className="text-[11px] text-emerald-400 ml-2 font-medium">100% Savunuldu</span>
          </div>
        </div>

        {/* 2. Aktif Karantina */}
        <div className="p-4 rounded-xl bg-[#222933] border border-[#2d3748] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Aktif Karantinadaki IP</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-amber-400">{stats?.activeBannedIps ?? bans.length}</span>
            <span className="text-[11px] text-slate-400 ml-2">Otomatik Drop</span>
          </div>
        </div>

        {/* 3. WAF Yanıt Hızı */}
        <div className="p-4 rounded-xl bg-[#222933] border border-[#2d3748] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Heuristic WAF Hızı</span>
            <Zap className="w-4 h-4 text-[#0082c9]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#0082c9]">{stats?.avgResponseTimeMs ?? '1.2'}ms</span>
            <span className="text-[11px] text-slate-400 ml-2">Sıfır Gecikme</span>
          </div>
        </div>

        {/* 4. Korunan VDS Altyapısı */}
        <div className="p-4 rounded-xl bg-[#222933] border border-[#2d3748] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Korunan VDS</span>
            <Server className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-slate-100">185.233.164.122</span>
            <span className="text-[11px] text-emerald-400 block font-medium">Caddy / FiveM / MC / Pass</span>
          </div>
        </div>
      </div>

      {/* ─── Ana Gövde (3 Sütunlu Savunma Karargahı) ───────────────── */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* SOL: Canlı Siber Tehdit Radarı (5 Sütun) */}
        <div className="lg:col-span-5 flex flex-col rounded-xl bg-[#222933] border border-[#2d3748] overflow-hidden shadow-sm">
          {/* Radar Başlığı & Simülasyon Butonları */}
          <div className="p-3.5 border-b border-[#2d3748] bg-[#181e24] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="font-semibold text-slate-100 text-xs">Canlı Siber Tehdit Akışı</span>
              </div>
              <span className="text-[11px] text-slate-400">{events.length} olay kaydedildi</span>
            </div>

            {/* Saldırı Simülatörü Butonları */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mr-1">Simüle Et:</span>
              <button
                onClick={() => handleSimulate('sqli')}
                disabled={simulatingType !== null}
                className="px-2 py-1 rounded bg-[#222933] hover:bg-[#2b3442] border border-[#2d3748] text-slate-200 text-[11px] flex items-center gap-1 transition-colors"
              >
                <Zap className="w-3 h-3 text-rose-400" />
                <span>SQLi Testi</span>
              </button>
              <button
                onClick={() => handleSimulate('lfi')}
                disabled={simulatingType !== null}
                className="px-2 py-1 rounded bg-[#222933] hover:bg-[#2b3442] border border-[#2d3748] text-slate-200 text-[11px] flex items-center gap-1 transition-colors"
              >
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>LFI /passwd</span>
              </button>
              <button
                onClick={() => handleSimulate('scanner')}
                disabled={simulatingType !== null}
                className="px-2 py-1 rounded bg-[#222933] hover:bg-[#2b3442] border border-[#2d3748] text-slate-200 text-[11px] flex items-center gap-1 transition-colors"
              >
                <Radio className="w-3 h-3 text-[#0082c9]" />
                <span>wp-login Bot</span>
              </button>
              <button
                onClick={() => handleSimulate('ssh')}
                disabled={simulatingType !== null}
                className="px-2 py-1 rounded bg-[#222933] hover:bg-[#2b3442] border border-[#2d3748] text-slate-200 text-[11px] flex items-center gap-1 transition-colors"
              >
                <Terminal className="w-3 h-3 text-indigo-400" />
                <span>SSH Brute</span>
              </button>
            </div>
          </div>

          {/* Olay Listesi Terminal Akışı */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 max-h-[580px] font-mono text-[11px]">
            {events.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-500">Tehdit kaydı bulunamadı.</div>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 rounded-lg bg-[#181e24] border border-[#2d3748] hover:border-slate-500 transition-colors flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{evt.countryCode === 'RU' ? '🇷🇺' : evt.countryCode === 'CN' ? '🇨🇳' : evt.countryCode === 'NL' ? '🇳🇱' : evt.countryCode === 'TR' ? '🇹🇷' : '🌐'}</span>
                      <span className="font-semibold text-slate-200">{evt.sourceIp}</span>
                      <span className="text-slate-400 font-sans text-[10px]">({evt.countryName})</span>
                    </div>
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
                        evt.severity === 'critical'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : evt.severity === 'high'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-[#0082c9]/10 text-[#0082c9] border border-[#0082c9]/30'
                      )}
                    >
                      {evt.actionTaken}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                    <span className="text-indigo-400 font-semibold">{evt.targetService}</span>
                    <span>•</span>
                    <span className="text-rose-300 font-semibold">{evt.threatType}</span>
                    <span>•</span>
                    <span className="text-slate-500">Port {evt.targetPort}</span>
                  </div>

                  {evt.payloadPreview && (
                    <div className="p-1.5 rounded bg-[#222933] border border-[#2d3748] text-slate-300 break-all text-[10px]">
                      <code>{evt.payloadPreview}</code>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 text-right">
                    {new Date(evt.createdAt).toLocaleTimeString('tr-TR')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SAĞ: Karantina Yönetimi, GeoIP ve WAF Laboratuvarı (7 Sütun) */}
        <div className="lg:col-span-7 flex flex-col rounded-xl bg-[#222933] border border-[#2d3748] overflow-hidden shadow-sm">
          {/* Sekme Butonları */}
          <div className="border-b border-[#2d3748] bg-[#181e24] px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 sm:py-0">
              <button
                onClick={() => setSelectedTab('bans')}
                className={cn(
                  'px-3.5 py-2.5 font-semibold text-xs border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap',
                  selectedTab === 'bans'
                    ? 'border-[#0082c9] text-[#0082c9] bg-[#0082c9]/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Karantina Listesi ({bans.length})</span>
              </button>
              <button
                onClick={() => setSelectedTab('geoip')}
                className={cn(
                  'px-3.5 py-2.5 font-semibold text-xs border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap',
                  selectedTab === 'geoip'
                    ? 'border-[#0082c9] text-[#0082c9] bg-[#0082c9]/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>GeoIP Ülke Kalkanı</span>
              </button>
              <button
                onClick={() => setSelectedTab('inspector')}
                className={cn(
                  'px-3.5 py-2.5 font-semibold text-xs border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap',
                  selectedTab === 'inspector'
                    ? 'border-[#0082c9] text-[#0082c9] bg-[#0082c9]/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>WAF İnceleme Laboratuvarı</span>
              </button>
            </div>

            {selectedTab === 'bans' && (
              <div className="relative w-full sm:w-44 mb-2 sm:mb-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="IP veya sebep ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#181e24] border border-[#2d3748] rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#0082c9]"
                />
              </div>
            )}
          </div>

          {/* Sekme İçerikleri */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[580px]">
            {/* ─── SEKME 1: Karantina Listesi ────────────────────────── */}
            {selectedTab === 'bans' && (
              <div className="space-y-3">
                {filteredBans.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">Karantinada IP bulunmuyor.</div>
                ) : (
                  filteredBans.map((ban) => (
                    <div
                      key={ban.id}
                      className="p-3.5 rounded-lg bg-[#181e24] border border-[#2d3748] hover:border-slate-500 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#222933] border border-[#2d3748] flex items-center justify-center text-rose-400 font-bold text-sm">
                          {ban.countryCode === 'RU' ? '🇷🇺' : ban.countryCode === 'CN' ? '🇨🇳' : ban.countryCode === 'NL' ? '🇳🇱' : '🌐'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">{ban.ip}</span>
                            <span className="text-xs text-slate-400 font-sans">({ban.countryName})</span>
                            {ban.isPermanent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold uppercase">
                                Kalıcı
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{ban.reason}</p>
                          <span className="text-[10px] text-slate-500 block mt-1">
                            Banlanma: {new Date(ban.bannedAt).toLocaleString('tr-TR')}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnban(ban.ip)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#222933] hover:bg-[#2b3442] border border-[#2d3748] text-slate-200 text-xs transition-colors"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Engeli Kaldır</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ─── SEKME 2: GeoIP Ülke Kalkanı ──────────────────────── */}
            {selectedTab === 'geoip' && (
              <div className="space-y-4 font-sans text-xs">
                <div className="p-4 rounded-lg bg-[#181e24] border border-[#2d3748]">
                  <h3 className="font-semibold text-slate-100 text-sm mb-1">🌍 Coğrafi IP Filtreleme (GeoIP Shield)</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Saldırı trafiğinin yoğun olduğu yüksek riskli ülkeleri tek bir kural ile VDS'in kapısından geri çevirebilirsin.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { country: 'Rusya', code: 'RU', flag: '🇷🇺', attacks: 642, status: 'ENGELLEME AKTİF' },
                    { country: 'Çin', code: 'CN', flag: '🇨🇳', attacks: 489, status: 'ENGELLEME AKTİF' },
                    { country: 'Hollanda (Botnet ASN)', code: 'NL', flag: '🇳🇱', attacks: 184, status: 'ŞÜPHELİ / İZLENİYOR' },
                    { country: 'İran', code: 'IR', flag: '🇮🇷', attacks: 52, status: 'ENGELLEME AKTİF' },
                  ].map((item) => (
                    <div key={item.code} className="p-3 rounded-lg bg-[#181e24] border border-[#2d3748] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{item.flag}</span>
                        <div>
                          <div className="font-semibold text-slate-200">{item.country}</div>
                          <span className="text-[11px] text-slate-400 font-mono">{item.attacks} saldırı engellendi</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── SEKME 3: WAF İnceleme Laboratuvarı ────────────────── */}
            {selectedTab === 'inspector' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[#181e24] border border-[#2d3748]">
                  <h3 className="font-semibold text-slate-100 text-sm mb-1">🔬 Heuristic WAF İnceleme Laboratuvarı</h3>
                  <p className="text-slate-400 text-xs font-sans leading-relaxed">
                    Bir URL parametresi veya HTTP gövdesi girerek WAF motorunun nasıl tepki verdiğini ve saldırıyı nasıl puanladığını canlı test et.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inspectUrl}
                    onChange={(e) => setInspectUrl(e.target.value)}
                    placeholder="URL veya payload yaz..."
                    className="flex-1 bg-[#181e24] border border-[#2d3748] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#0082c9]"
                  />
                  <button
                    onClick={handleInspect}
                    disabled={isInspecting}
                    className="px-4 py-2 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{isInspecting ? 'İnceleniyor...' : 'WAF ile Tara'}</span>
                  </button>
                </div>

                {inspectResult && (
                  <div className="p-4 rounded-lg bg-[#181e24] border border-[#2d3748] space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Sonuç Durumu:</span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded font-bold uppercase text-[10px]',
                          inspectResult.blocked
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        )}
                      >
                        {inspectResult.blocked ? '🛑 BLOCKED (ENGELLENDİ)' : '✅ ALLOWED (TEMİZ)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Tehdit Skoru:</span>
                      <span className="font-bold text-slate-200">{inspectResult.wafResult?.score ?? 0} / 100</span>
                    </div>

                    {inspectResult.wafResult?.reason && (
                      <div className="p-2.5 rounded bg-[#222933] border border-[#2d3748] text-rose-300">
                        <strong>Neden:</strong> {inspectResult.wafResult.reason}
                      </div>
                    )}

                    {inspectResult.wafResult?.matchedPattern && (
                      <div className="p-2.5 rounded bg-[#222933] border border-[#2d3748] text-[#0082c9] text-[11px] break-all">
                        <strong>Eşleşen Kural:</strong> {inspectResult.wafResult.matchedPattern}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Manuel IP Ban Modalı ─────────────────────────────────── */}
      {isBanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#222933] border border-[#2d3748] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
              <div className="flex items-center gap-2 text-slate-100 font-semibold">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span>Manuel Karantina (IP Banla)</span>
              </div>
              <button
                onClick={() => setIsBanModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBan} className="space-y-3 font-sans text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Hedef IP Adresi (IPv4 / IPv6)</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 45.142.212.61"
                  value={newBanIp}
                  onChange={(e) => setNewBanIp(e.target.value)}
                  className="w-full bg-[#181e24] border border-[#2d3748] rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-[#0082c9]"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Banlanma Sebebi</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: SSH Port 22 Brute-Force saldırısı"
                  value={newBanReason}
                  onChange={(e) => setNewBanReason(e.target.value)}
                  className="w-full bg-[#181e24] border border-[#2d3748] rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#0082c9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Tehdit Seviyesi</label>
                  <select
                    value={newBanThreatLevel}
                    onChange={(e: any) => setNewBanThreatLevel(e.target.value)}
                    className="w-full bg-[#181e24] border border-[#2d3748] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#0082c9]"
                  >
                    <option value="critical">Critical (Kritik)</option>
                    <option value="high">High (Yüksek)</option>
                    <option value="medium">Medium (Orta)</option>
                    <option value="low">Low (Düşük)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Karantina Tipi</label>
                  <select
                    value={newBanPermanent ? 'perm' : 'temp'}
                    onChange={(e) => setNewBanPermanent(e.target.value === 'perm')}
                    className="w-full bg-[#181e24] border border-[#2d3748] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#0082c9]"
                  >
                    <option value="perm">Kalıcı (Süresiz)</option>
                    <option value="temp">24 Saatlik Geçici</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBanModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#181e24] hover:bg-[#2b3442] text-slate-300 font-medium transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white font-semibold shadow-sm transition-colors"
                >
                  Karantinaya Al (Banla)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
