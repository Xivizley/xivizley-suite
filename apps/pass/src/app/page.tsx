'use client';

// ============================================================
// XIVIZLEY Pass — Zero-Knowledge Password, Secret & 2FA Manager
// Aurora Night 3-Column Cockpit
// ============================================================

import React, { useEffect, useState, useMemo } from 'react';
import {
  Key,
  ShieldCheck,
  Search,
  Plus,
  Star,
  Copy,
  Check,
  Eye,
  EyeOff,
  Server,
  Globe,
  FileText,
  Terminal,
  ExternalLink,
  Trash2,
  Edit2,
  RefreshCw,
  Folder,
  Sliders,
  Sparkles,
  Lock,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VaultItem } from '@/server/services/passService';

export default function PassDashboard() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Görünürlük & Kopyalama Durumları
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 2FA TOTP Durumu
  const [totpData, setTotpData] = useState<{ code: string; remainingSeconds: number } | null>(null);

  // Modallar
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    type: 'login' as VaultItem['type'],
    username: '',
    password: '',
    url: '',
    totpSecret: '',
    folder: 'Sunucular & Altyapı',
    notes: '',
  });

  // Generator State
  const [genLength, setGenLength] = useState(20);
  const [genSymbols, setGenSymbols] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genUppercase, setGenUppercase] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // ─── Veri Çekme ───────────────────────────────────────────
  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/vault');
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        setItems(data.data);
        if (data.data.length > 0 && !selectedId) {
          setSelectedId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Kasa yüklenemedi', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === selectedId) || null;
  }, [items, selectedId]);

  // Seçili öğe değiştikçe şifre gizlemeyi sıfırla
  useEffect(() => {
    setShowPassword(false);
  }, [selectedId]);

  // ─── Canlı 2FA TOTP Çekme ─────────────────────────────────
  useEffect(() => {
    if (!selectedItem || !selectedItem.totpSecret) {
      setTotpData(null);
      return;
    }

    const fetchTotp = async () => {
      try {
        const res = await fetch(`/api/vault/${selectedItem.id}/totp`);
        const data = await res.json();
        if (data.ok && data.data) {
          setTotpData({
            code: data.data.code,
            remainingSeconds: data.data.remainingSeconds,
          });
        }
      } catch {
        // ignore
      }
    };

    fetchTotp();
    const interval = setInterval(fetchTotp, 1000);
    return () => clearInterval(interval);
  }, [selectedItem]);

  // ─── Kopyalama Yardımcısı ──────────────────────────────────
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // ─── Parola Üretici Motoru ─────────────────────────────────
  const generatePassword = () => {
    let chars = 'abcdefghijkmnopqrstuvwxyz';
    if (genUppercase) chars += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    if (genNumbers) chars += '23456789';
    if (genSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let res = '';
    const array = new Uint32Array(genLength);
    crypto.getRandomValues(array);
    for (let i = 0; i < genLength; i++) {
      const val = array[i];
      if (val !== undefined) {
        res += chars[val % chars.length] || '';
      }
    }
    setGeneratedPassword(res);
  };

  useEffect(() => {
    if (isGeneratorOpen) {
      generatePassword();
    }
  }, [isGeneratorOpen, genLength, genSymbols, genNumbers, genUppercase]);

  // ─── Favori Değiştirme ─────────────────────────────────────
  const toggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/vault/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleFavorite: true }),
      });
      const data = await res.json();
      if (data.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isFavorite: data.isFavorite } : i))
        );
      }
    } catch {
      // ignore
    }
  };

  // ─── Öğe Silme ─────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Bu öğeyi kasanızdan silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/vault/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        if (selectedId === id) {
          setSelectedId(null);
        }
      }
    } catch (err) {
      console.error('Silinemedi', err);
    }
  };

  // ─── Yeni Öğe Kaydetme ─────────────────────────────────────
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setItems((prev) => [data.data, ...prev]);
        setSelectedId(data.data.id);
        setIsAddOpen(false);
        setFormData({
          title: '',
          type: 'login',
          username: '',
          password: '',
          url: '',
          totpSecret: '',
          folder: 'Sunucular & Altyapı',
          notes: '',
        });
      }
    } catch (err) {
      console.error('Kayıt başarısız', err);
    }
  };

  // ─── Filtreleme & Arama ────────────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtre kontrolü
      if (selectedFilter === 'favorites' && !item.isFavorite) return false;
      if (selectedFilter === 'login' && item.type !== 'login') return false;
      if (selectedFilter === 'server_ssh' && item.type !== 'server_ssh') return false;
      if (selectedFilter === 'api_key' && item.type !== 'api_key') return false;
      if (selectedFilter === 'secure_note' && item.type !== 'secure_note') return false;
      if (selectedFilter.startsWith('folder:')) {
        const folderName = selectedFilter.replace('folder:', '');
        if (item.folder !== folderName) return false;
      }

      // Arama kontrolü
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const userMatch = item.username?.toLowerCase().includes(q);
        const urlMatch = item.url?.toLowerCase().includes(q);
        return titleMatch || userMatch || urlMatch;
      }
      return true;
    });
  }, [items, selectedFilter, searchQuery]);

  const getItemIcon = (type: VaultItem['type']) => {
    switch (type) {
      case 'server_ssh':
        return <Terminal className="h-4 w-4 text-emerald-400" />;
      case 'api_key':
        return <Zap className="h-4 w-4 text-amber-400" />;
      case 'secure_note':
        return <FileText className="h-4 w-4 text-indigo-400" />;
      case 'card':
        return <ShieldCheck className="h-4 w-4 text-purple-400" />;
      case 'login':
      default:
        return <Globe className="h-4 w-4 text-cyan-400" />;
    }
  };

  return (
    <div className="h-screen w-screen flex bg-[#07090E] text-slate-100 overflow-hidden font-sans">
      {/* ─── SOL SIDEBAR: Kasa Filtreleri & Klasörler ──────────── */}
      <aside className="w-64 border-r border-white/5 bg-[#0A0D14]/80 flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Logo Header */}
          <div className="h-16 border-b border-white/5 px-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#0A0D14] rounded-[11px] flex items-center justify-center">
                <Key className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">
                  XIVIZLEY Pass
                </span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                  VAULT
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Sıfır Bilgili Şifre Kasası</p>
            </div>
          </div>

          {/* Menü & Filtreler */}
          <div className="p-3 space-y-1">
            <div className="px-2 py-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
              Kasa Filtreleri
            </div>

            <button
              onClick={() => setSelectedFilter('all')}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all',
                selectedFilter === 'all'
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Key className="h-3.5 w-3.5 text-cyan-400" />
                <span>Tüm Öğeler</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {items.length}
              </span>
            </button>

            <button
              onClick={() => setSelectedFilter('favorites')}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all',
                selectedFilter === 'favorites'
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <span>Favoriler</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {items.filter((i) => i.isFavorite).length}
              </span>
            </button>

            <button
              onClick={() => setSelectedFilter('server_ssh')}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all',
                selectedFilter === 'server_ssh'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                <span>Sunucu & SSH</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {items.filter((i) => i.type === 'server_ssh').length}
              </span>
            </button>

            <button
              onClick={() => setSelectedFilter('api_key')}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all',
                selectedFilter === 'api_key'
                  ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>API Anahtarları</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {items.filter((i) => i.type === 'api_key').length}
              </span>
            </button>

            <button
              onClick={() => setSelectedFilter('login')}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all',
                selectedFilter === 'login'
                  ? 'bg-sky-500/10 text-sky-300 border border-sky-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="h-3.5 w-3.5 text-sky-400" />
                <span>Web Girişleri</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {items.filter((i) => i.type === 'login').length}
              </span>
            </button>
          </div>

          {/* Klasörler */}
          <div className="p-3 pt-1 space-y-1">
            <div className="px-2 py-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
              Klasörler
            </div>

            {['Sunucular & Altyapı', 'E-Posta & İletişim', 'API & Servisler'].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFilter(`folder:${f}`)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all',
                  selectedFilter === `folder:${f}`
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <Folder className="h-3 w-3 text-slate-500" />
                  <span className="truncate">{f}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-600">
                  {items.filter((i) => i.folder === f).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Alt Kısım: Güvenlik Rozeti & Parola Üretici */}
        <div className="p-3 border-t border-white/5 space-y-2">
          <button
            onClick={() => setIsGeneratorOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 hover:from-cyan-500/20 hover:to-indigo-500/20 border border-cyan-500/20 text-xs font-semibold text-cyan-300 transition-all active:scale-95 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Süper Parola Üret</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[10px] text-slate-400 font-mono">
            <Lock className="h-3 w-3 text-emerald-400 shrink-0" />
            <span className="truncate">AES-256-GCM Uçtan Uca</span>
          </div>
        </div>
      </aside>

      {/* ─── ORTA LİSTE: Arama & Öğe Kartları ──────────────────── */}
      <section className="w-80 sm:w-96 border-r border-white/5 bg-[#080B12] flex flex-col shrink-0">
        {/* Arama & Ekle Çubuğu */}
        <div className="h-16 border-b border-white/5 px-4 flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kasada ara... (Cmd+K)"
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="h-9 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-cyan-500/20 shrink-0"
            title="Yeni Şifre / Anahtar Ekle"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ekle</span>
          </button>
        </div>

        {/* Öğe Kartları Listesi */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto text-cyan-400 mb-2" />
              <span>Kasa yükleniyor...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2">
              <Key className="h-8 w-8 mx-auto text-slate-600 mb-1" />
              <p>Hiçbir öğe bulunamadı.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    'p-3 rounded-xl border transition-all cursor-pointer group',
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-950/40 to-slate-900 border-cyan-500/40 shadow-lg shadow-cyan-950/30'
                      : 'bg-[#0A0E17]/60 hover:bg-[#0E131F] border-white/5 hover:border-white/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        {getItemIcon(item.type)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-200 truncate">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                          {item.username || item.url || 'Kayıtlı Parola'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.totpSecret && (
                        <span
                          className="p-1 text-[9px] font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold"
                          title="2FA Authenticator Aktif"
                        >
                          2FA
                        </span>
                      )}
                      <button
                        onClick={(e) => toggleFavorite(item.id, e)}
                        className={cn(
                          'p-1 rounded-md transition-colors',
                          item.isFavorite
                            ? 'text-amber-400'
                            : 'text-slate-600 hover:text-slate-400'
                        )}
                        title="Favori"
                      >
                        <Star className="h-3 w-3 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ─── SAĞ DETAY PANELİ: Seçili Parola & 2FA HUD ─────────── */}
      <main className="flex-1 flex flex-col bg-[#07090E] overflow-y-auto">
        {selectedItem ? (
          <div className="max-w-3xl w-full mx-auto p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center shadow-lg">
                  {getItemIcon(selectedItem.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {selectedItem.title}
                    </h2>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                      {selectedItem.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Klasör:{' '}
                    <span className="text-slate-200 font-medium">
                      {selectedItem.folder}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(selectedItem.id)}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition-colors"
                  title="Öğeyi Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 2FA Authenticator Bannerı (Varsa) */}
            {selectedItem.totpSecret && totpData && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0B1516] to-[#0A101D] border border-emerald-500/30 p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider block">
                        2FA Doğrulama Kodu (TOTP)
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-2xl sm:text-3xl font-mono font-black text-white tracking-widest">
                          {totpData.code.slice(0, 3)} {totpData.code.slice(3, 6)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {totpData.remainingSeconds}s
                      </span>
                      <span className="text-[9px] text-slate-500 block">kalan süre</span>
                    </div>

                    <button
                      onClick={() => copyToClipboard(totpData.code, 'totp')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-medium text-emerald-300 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      {copiedKey === 'totp' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Alanlar Kartı */}
            <div className="rounded-2xl border border-white/5 bg-[#0B0F17]/80 divide-y divide-white/5">
              {/* Kullanıcı Adı */}
              {selectedItem.username && (
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">
                      Kullanıcı Adı / Hesap
                    </span>
                    <span className="text-sm font-medium text-slate-200 mt-0.5 block font-mono">
                      {selectedItem.username}
                    </span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(selectedItem.username!, 'user')}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                    title="Kullanıcı Adını Kopyala"
                  >
                    {copiedKey === 'user' ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}

              {/* Parola / Gizli Anahtar */}
              {selectedItem.password && (
                <div className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-4">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">
                      Parola / Gizli Anahtar
                    </span>
                    <span className="text-sm font-mono font-medium text-slate-200 mt-0.5 block truncate">
                      {showPassword ? selectedItem.password : '••••••••••••••••••••'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                      title={showPassword ? 'Gizle' : 'Göster'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      onClick={() => copyToClipboard(selectedItem.password!, 'pass')}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-medium text-cyan-300 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      {copiedKey === 'pass' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* URL / Hedef Sunucu */}
              {selectedItem.url && (
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">
                      Web Sitesi / Sunucu Adresi
                    </span>
                    <span className="text-sm font-mono text-cyan-400 mt-0.5 block">
                      {selectedItem.url}
                    </span>
                  </div>

                  <a
                    href={
                      selectedItem.url.startsWith('http')
                        ? selectedItem.url
                        : `http://${selectedItem.url}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Bağlantıyı Aç"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}

              {/* Notlar */}
              {selectedItem.notes && (
                <div className="p-4">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">
                    Güvenli Notlar & Talimatlar
                  </span>
                  <p className="text-xs text-slate-300 mt-1 whitespace-pre-wrap font-sans">
                    {selectedItem.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-600">
              <Key className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Bir Öğe Seçin</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Sol listeden görüntülemek istediğiniz şifre veya sunucuyu seçin, ya da yeni bir kayıt ekleyin.
              </p>
            </div>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Şifre / Anahtar Ekle</span>
            </button>
          </div>
        )}
      </main>

      {/* ─── MODAL: Yeni Öğe Ekle ──────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B0F17] border border-white/10 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Key className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Yeni Kasa Öğesi Ekle</h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Tür</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as any })
                    }
                    className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="login">Web Girişi</option>
                    <option value="server_ssh">Sunucu / SSH</option>
                    <option value="api_key">API Anahtarı</option>
                    <option value="secure_note">Güvenli Not</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Klasör</label>
                  <select
                    value={formData.folder}
                    onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Sunucular & Altyapı">Sunucular & Altyapı</option>
                    <option value="E-Posta & İletişim">E-Posta & İletişim</option>
                    <option value="API & Servisler">API & Servisler</option>
                    <option value="Kişisel">Kişisel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Başlık <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Sunucu B SSH veya GitHub"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Kullanıcı Adı / Hesap
                  </label>
                  <input
                    type="text"
                    placeholder="root veya e-posta"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Parola / Gizli Değer
                  </label>
                  <input
                    type="text"
                    placeholder="Parola girin"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    URL veya IP:Port
                  </label>
                  <input
                    type="text"
                    placeholder="109.104.120.126:22"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    2FA Secret (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    placeholder="JBSWY3DPEHPK3PXP"
                    value={formData.totpSecret}
                    onChange={(e) => setFormData({ ...formData, totpSecret: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Notlar</label>
                <textarea
                  rows={2}
                  placeholder="Ek güvenlik detayları..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                >
                  Kasaya Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Süper Parola Üretici ──────────────────────── */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0B0F17] border border-white/10 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Süper Parola Üretici</h3>
              </div>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Üretilen Parola Kartı */}
            <div className="p-4 rounded-xl bg-black/50 border border-cyan-500/30 flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-cyan-300 font-bold break-all">
                {generatedPassword}
              </span>
              <button
                onClick={() => copyToClipboard(generatedPassword, 'gen')}
                className="p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-colors shrink-0"
                title="Kopyala"
              >
                {copiedKey === 'gen' ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Seçenekler */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-mono">
                  <span>Uzunluk</span>
                  <span className="text-cyan-400 font-bold">{genLength} Karakter</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={genLength}
                  onChange={(e) => setGenLength(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genUppercase}
                    onChange={(e) => setGenUppercase(e.target.checked)}
                    className="accent-cyan-400"
                  />
                  <span>Büyük Harf (A-Z)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genNumbers}
                    onChange={(e) => setGenNumbers(e.target.checked)}
                    className="accent-cyan-400"
                  />
                  <span>Rakamlar (0-9)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5 cursor-pointer col-span-2">
                  <input
                    type="checkbox"
                    checked={genSymbols}
                    onChange={(e) => setGenSymbols(e.target.checked)}
                    className="accent-cyan-400"
                  />
                  <span>Özel Semboller (!@#$%^&*)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                onClick={generatePassword}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Tekrar Üret</span>
              </button>

              <button
                onClick={() => {
                  copyToClipboard(generatedPassword, 'gen');
                  setIsGeneratorOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
              >
                Kopyala & Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
