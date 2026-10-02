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
  Download,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NextcloudHeader, useToast } from '@xivizley/aurora-ui';
import type { VaultItem } from '@/server/services/passService';
import { PassImportExportModal } from '@/components/PassImportExportModal';

// ─── 30s Dairesel SVG TOTP Geri Sayım Halkası ───────────────
function TotpCountdownRing({ remainingSeconds }: { remainingSeconds: number }) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius; // ~94.25
  const clampedSeconds = Math.max(0, Math.min(remainingSeconds, 30));
  const offset = circumference * (1 - clampedSeconds / 30);

  const isCritical = remainingSeconds <= 3;
  const isWarning = remainingSeconds <= 7 && !isCritical;

  const strokeColor = isCritical
    ? '#f43f5e' // rose-500
    : isWarning
    ? '#f59e0b' // amber-500
    : '#10b981'; // emerald-500

  const textColor = isCritical
    ? 'text-rose-400'
    : isWarning
    ? 'text-amber-400'
    : 'text-emerald-400';

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          {/* Arka plan sönük halka */}
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="2.75"
          />
          {/* Animasyonlu dinamik geri sayım halkası */}
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: remainingSeconds >= 30 ? 'none' : 'stroke-dashoffset 1s linear, stroke 0.3s ease',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-[11px] font-mono font-black ${textColor}`}>
            {remainingSeconds}
          </span>
        </div>
      </div>
      <div className="text-right">
        <span className={`text-xs font-mono font-bold ${textColor}`}>
          {remainingSeconds}s
        </span>
        <span className="text-[9px] text-slate-400 block font-sans">kalan süre</span>
      </div>
    </div>
  );
}

// ─── Parola Gücü & Entropi Hesaplayıcı ───────────────────────
interface PasswordStrength {
  score: number;
  entropyBits: number;
  label: 'Çok Zayıf' | 'Zayıf' | 'Orta' | 'Çok Güçlü';
  colorClass: string;
  hasMinLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function calculatePasswordStrength(pass: string): PasswordStrength {
  if (!pass) {
    return {
      score: 0,
      entropyBits: 0,
      label: 'Çok Zayıf',
      colorClass: 'bg-rose-500',
      hasMinLength: false,
      hasLower: false,
      hasUpper: false,
      hasNumber: false,
      hasSpecial: false,
    };
  }

  const hasLower = /[a-z]/.test(pass);
  const hasUpper = /[A-Z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);
  const hasMinLength = pass.length >= 12;

  let poolSize = 0;
  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasNumber) poolSize += 10;
  if (hasSpecial) poolSize += 33;

  const entropyBits = Math.round(pass.length * (poolSize > 0 ? Math.log2(poolSize) : 0));

  let score = 0;
  if (hasMinLength) score++;
  if (hasLower && hasUpper) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;
  if (pass.length >= 16 && score >= 3) score = 4;

  // Güvenlik eşikleri: 8 karakterden kısa şifreler "Çok Zayıf", 12'den kısalar en fazla "Zayıf"
  if (pass.length < 8) {
    score = Math.min(score, 1);
  } else if (!hasMinLength) {
    score = Math.min(score, 2);
  }

  let label: 'Çok Zayıf' | 'Zayıf' | 'Orta' | 'Çok Güçlü' = 'Çok Zayıf';
  let colorClass = 'bg-rose-500';

  if (score <= 1) {
    label = 'Çok Zayıf';
    colorClass = 'bg-rose-500';
  } else if (score === 2) {
    label = 'Zayıf';
    colorClass = 'bg-amber-500';
  } else if (score === 3) {
    label = 'Orta';
    colorClass = 'bg-sky-400';
  } else {
    label = 'Çok Güçlü';
    colorClass = 'bg-emerald-500';
  }

  return {
    score,
    entropyBits,
    label,
    colorClass,
    hasMinLength,
    hasLower,
    hasUpper,
    hasNumber,
    hasSpecial,
  };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = calculatePasswordStrength(password);
  if (!password) return null;

  return (
    <div className="space-y-2 select-none pt-1">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="text-slate-400">Güvenlik:</span>
          <span
            className={
              strength.score <= 1
                ? 'text-rose-400 font-semibold'
                : strength.score === 2
                ? 'text-amber-400 font-semibold'
                : strength.score === 3
                ? 'text-sky-400 font-semibold'
                : 'text-emerald-400 font-semibold'
            }
          >
            {strength.label}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          ~{strength.entropyBits} bit entropi
        </span>
      </div>

      {/* 4 Seviyeli Görsel Bar */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full rounded-full transition-all duration-300 ${
              step <= strength.score ? strength.colorClass : 'bg-slate-700/60'
            }`}
          />
        ))}
      </div>

      {/* Kural Kontrol Rozetleri */}
      <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-mono">
        <span
          className={`px-1.5 py-0.5 rounded border transition-colors ${
            strength.hasMinLength
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
          }`}
        >
          {strength.hasMinLength ? '✓' : '○'} 12+ Karakter
        </span>
        <span
          className={`px-1.5 py-0.5 rounded border transition-colors ${
            strength.hasUpper && strength.hasLower
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
          }`}
        >
          {strength.hasUpper && strength.hasLower ? '✓' : '○'} Büyük & Küçük
        </span>
        <span
          className={`px-1.5 py-0.5 rounded border transition-colors ${
            strength.hasNumber
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
          }`}
        >
          {strength.hasNumber ? '✓' : '○'} Rakam
        </span>
        <span
          className={`px-1.5 py-0.5 rounded border transition-colors ${
            strength.hasSpecial
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
          }`}
        >
          {strength.hasSpecial ? '✓' : '○'} Sembol
        </span>
      </div>
    </div>
  );
}

export default function PassDashboard() {
  const toast = useToast();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Görünürlük & Kopyalama Durumları
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 2FA TOTP Durumu
  const [totpData, setTotpData] = useState<{ code: string; remainingSeconds: number } | null>(null);

  // Modallar
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importExportTab, setImportExportTab] = useState<'export' | 'import'>('export');

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
  const copyToClipboard = (text: string, key: string, label = 'Değer') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} panoya kopyalandı.`);
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
        toast.success(data.isFavorite ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.');
      }
    } catch {
      toast.error('Favori güncellenemedi.');
    }
  };

  // ─── Öğe Silme ─────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const itemToDelete = items.find((i) => i.id === id);
    if (!confirm(`"${itemToDelete?.title || 'Bu öğeyi'}" kasanızdan silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/vault/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        if (selectedId === id) {
          setSelectedId(null);
        }
        toast.success(`"${itemToDelete?.title || 'Öğe'}" kasanızdan silindi.`);
      }
    } catch (err) {
      toast.error('Öğe silinemedi.');
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
      if (res.ok && data.ok && data.data) {
        setItems((prev) => [data.data, ...prev]);
        setSelectedId(data.data.id);
        setIsAddOpen(false);
        toast.success(`"${formData.title}" başarıyla kasaya kaydedildi.`, {
          title: 'Kasa Güncellendi',
        });
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
      } else {
        toast.error(data.error || data.message || 'Kayıt oluşturulamadı.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Kayıt oluşturulamadı.');
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
        return <Globe className="h-4 w-4 text-[#0082c9]" />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#181e24] text-slate-100 overflow-hidden font-sans">
      {/* ─── Signature Nextcloud Header Bar ─────────────────── */}
      <NextcloudHeader
        activeApp="pass"
        title="Parolalar"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Parolalarda ara... (Cmd+K)"
        rightActions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setImportExportTab('export');
                setIsImportExportOpen(true);
              }}
              className="h-7 px-2.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Kasadaki parolaları Bitwarden JSON veya CSV olarak dışa aktar"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">📤 Dışa Aktar</span>
            </button>

            <button
              onClick={() => {
                setImportExportTab('import');
                setIsImportExportOpen(true);
              }}
              className="h-7 px-2.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Bitwarden, 1Password veya CSV'den parola içe aktar"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">📥 İçe Aktar</span>
            </button>

            <button
              onClick={() => setIsAddOpen(true)}
              className="h-7 px-3 rounded-md bg-white text-[#0082c9] hover:bg-white/90 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Yeni Şifre / Anahtar Ekle"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Yeni Parola</span>
            </button>
          </div>
        }
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobil Filtre Backdrop */}
        {isMobileFilterOpen && (
          <div
            className="fixed inset-0 top-12 bg-black/60 z-30 md:hidden animate-in fade-in"
            onClick={() => setIsMobileFilterOpen(false)}
          />
        )}

        {/* ─── SOL SIDEBAR: Kasa Filtreleri & Klasörler ──────────── */}
        <aside
          className={cn(
            'w-60 border-r border-[#2d3748] bg-[#222933] flex flex-col justify-between shrink-0 select-none p-3 transition-transform duration-200 z-40',
            'fixed inset-y-12 left-0 md:static md:translate-x-0',
            isMobileFilterOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
          )}
        >
          <div className="space-y-4">
            {/* Menü & Filtreler */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Kasa Filtreleri
                </span>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="md:hidden p-1 rounded-md text-slate-400 hover:text-white"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => setSelectedFilter('all')}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  selectedFilter === 'all'
                    ? 'bg-[#0082c9] text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#2b3442]'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Key className="h-3.5 w-3.5 text-[#38bdf8]" />
                  <span>Tüm Öğeler</span>
                </div>
                <span className="text-[10px] font-mono opacity-80 font-bold">
                  {items.length}
                </span>
              </button>

              <button
                onClick={() => setSelectedFilter('favorites')}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  selectedFilter === 'favorites'
                    ? 'bg-[#0082c9] text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#2b3442]'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  <span>Favoriler</span>
                </div>
                <span className="text-[10px] font-mono opacity-80 font-bold">
                  {items.filter((i) => i.isFavorite).length}
                </span>
              </button>

              <button
                onClick={() => setSelectedFilter('server_ssh')}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  selectedFilter === 'server_ssh'
                    ? 'bg-[#0082c9] text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#2b3442]'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Sunucu & SSH</span>
                </div>
                <span className="text-[10px] font-mono opacity-80 font-bold">
                  {items.filter((i) => i.type === 'server_ssh').length}
                </span>
              </button>

              <button
                onClick={() => setSelectedFilter('api_key')}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  selectedFilter === 'api_key'
                    ? 'bg-[#0082c9] text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#2b3442]'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span>API Anahtarları</span>
                </div>
                <span className="text-[10px] font-mono opacity-80 font-bold">
                  {items.filter((i) => i.type === 'api_key').length}
                </span>
              </button>

              <button
                onClick={() => setSelectedFilter('login')}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  selectedFilter === 'login'
                    ? 'bg-[#0082c9] text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#2b3442]'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="h-3.5 w-3.5 text-sky-400" />
                  <span>Web Girişleri</span>
                </div>
                <span className="text-[10px] font-mono opacity-80 font-bold">
                  {items.filter((i) => i.type === 'login').length}
                </span>
              </button>
            </div>

            {/* Klasörler */}
            <div className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Klasörler
              </div>

              {['Sunucular & Altyapı', 'E-Posta & İletişim', 'API & Servisler'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(`folder:${f}`)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all',
                    selectedFilter === `folder:${f}`
                      ? 'bg-[#2b3442] text-white font-medium border border-[#2d3748]'
                      : 'text-slate-300 hover:text-white hover:bg-[#2b3442]'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">{f}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {items.filter((i) => i.folder === f).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Alt Kısım: Güvenlik Rozeti & Parola Üretici */}
          <div className="pt-3 border-t border-[#2d3748] space-y-2">
            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#181e24] hover:bg-[#2b3442] border border-[#2d3748] text-xs font-semibold text-[#38bdf8] transition-all shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#0082c9]" />
              <span>Güçlü Parola Üret</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181e24] border border-[#2d3748] text-[10px] text-slate-400 font-mono">
              <Lock className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="truncate">AES-256-GCM Uçtan Uca Şifreli</span>
            </div>
          </div>
        </aside>

      {/* ─── ORTA LİSTE: Arama & Öğe Kartları ──────────────────── */}
      <section
        className={cn(
          'w-full md:w-80 lg:w-96 border-r border-[#2d3748] bg-[#181e24] flex flex-col shrink-0',
          selectedId ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Arama & Ekle Çubuğu */}
        <div className="h-12 border-b border-[#2d3748] px-3 flex items-center gap-2">
          {/* Mobil Filtre Açıcı */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="md:hidden h-8 px-2 rounded-lg bg-[#222933] border border-[#2d3748] text-slate-300 hover:text-white flex items-center gap-1 shrink-0"
            title="Kasa Filtreleri"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="text-xs">Filtre</span>
          </button>

          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kasada ara... (Cmd+K)"
              className="w-full h-8 pl-8 pr-16 rounded-lg bg-[#222933] border border-[#2d3748] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#0082c9] transition-all"
            />
            {searchQuery && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#181e24] text-[#38bdf8] border border-[#2d3748]">
                  {filteredItems.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                  title="Aramayı Temizle"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="h-8 px-2.5 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-sm shrink-0"
            title="Yeni Şifre / Anahtar Ekle"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ekle</span>
          </button>
        </div>

        {/* Öğe Kartları Listesi */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto text-[#0082c9] mb-2" />
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
                      ? 'bg-[#0082c9]/15 border-[#0082c9] shadow-sm'
                      : 'bg-[#222933] hover:bg-[#2b3442] border-[#2d3748]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#181e24] border border-[#2d3748] flex items-center justify-center shrink-0">
                        {getItemIcon(item.type)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
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
      <main
        className={cn(
          'flex-1 flex flex-col bg-[#181e24] overflow-y-auto',
          !selectedId ? 'hidden md:flex' : 'flex'
        )}
      >
        {selectedItem ? (
          <div className="max-w-3xl w-full mx-auto p-4 sm:p-8 space-y-6">
            {/* Mobil Geri Dön Butonu */}
            <div className="md:hidden pb-3 border-b border-[#2d3748]">
              <button
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0082c9] hover:text-[#006aa3]"
              >
                <span>← Parola Listesine Dön</span>
              </button>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#2d3748] pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#0082c9]/15 border border-[#0082c9]/30 flex items-center justify-center shadow-sm">
                  {getItemIcon(selectedItem.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {selectedItem.title}
                    </h2>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#222933] border border-[#2d3748] text-slate-300">
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
                  className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition-colors"
                  title="Öğeyi Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 2FA Authenticator Bannerı (Varsa) */}
            {selectedItem.totpSecret && totpData && (
              <div className="relative overflow-hidden rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
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
                    <TotpCountdownRing remainingSeconds={totpData.remainingSeconds} />

                    <button
                      onClick={() => copyToClipboard(totpData.code, 'totp', '2FA Doğrulama Kodu')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      {copiedKey === 'totp' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-white" />
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
            <div className="rounded-xl border border-[#2d3748] bg-[#222933] divide-y divide-[#2d3748]">
              {/* Kullanıcı Adı */}
              {selectedItem.username && (
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                      Kullanıcı Adı / Hesap
                    </span>
                    <span className="text-sm font-medium text-slate-200 mt-0.5 block font-mono">
                      {selectedItem.username}
                    </span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(selectedItem.username!, 'user', 'Kullanıcı Adı')}
                    className="p-2 rounded-lg hover:bg-[#181e24] text-slate-400 hover:text-slate-100 transition-colors"
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
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                      Parola / Gizli Anahtar
                    </span>
                    <span className="text-sm font-mono font-medium text-slate-200 mt-0.5 block truncate">
                      {showPassword ? selectedItem.password : '••••••••••••••••••••'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 rounded-lg hover:bg-[#181e24] text-slate-400 hover:text-slate-100 transition-colors"
                      title={showPassword ? 'Gizle' : 'Göster'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      onClick={() => copyToClipboard(selectedItem.password!, 'pass', 'Parola')}
                      className="px-3 py-1.5 rounded-lg bg-[#0082c9]/10 hover:bg-[#0082c9]/20 border border-[#0082c9]/30 text-xs font-medium text-[#0082c9] flex items-center gap-1.5 transition-all"
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
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                      Web Sitesi / Sunucu Adresi
                    </span>
                    <span className="text-sm font-mono text-[#0082c9] mt-0.5 block hover:underline">
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
                    className="p-2 rounded-lg hover:bg-[#181e24] text-slate-400 hover:text-[#0082c9] transition-colors"
                    title="Bağlantıyı Aç"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}

              {/* Notlar */}
              {selectedItem.notes && (
                <div className="p-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
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
            <div className="w-16 h-16 rounded-2xl bg-[#222933] border border-[#2d3748] flex items-center justify-center text-slate-400">
              <Key className="w-8 h-8 text-[#0082c9]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Bir Öğe Seçin</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Sol listeden görüntülemek istediğiniz şifre veya sunucuyu seçin, ya da yeni bir kayıt ekleyin.
              </p>
            </div>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Şifre / Anahtar Ekle</span>
            </button>
          </div>
        )}
      </main>
      </div>

      {/* ─── MODAL: Yeni Öğe Ekle ──────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#222933] border border-[#2d3748] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0082c9]/10 border border-[#0082c9]/20 flex items-center justify-center text-[#0082c9]">
                  <Key className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-100">Yeni Kasa Öğesi Ekle</h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
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
                    className="w-full h-9 px-3 rounded-lg bg-[#181e24] border border-[#2d3748] text-xs text-slate-100 focus:outline-none focus:border-[#0082c9]"
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
                    className="w-full h-9 px-3 rounded-lg bg-[#181e24] border border-[#2d3748] text-xs text-slate-100 focus:outline-none focus:border-[#0082c9]"
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
                  className="w-full h-9 px-3 rounded-lg bg-[#181e24] border border-[#2d3748] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#0082c9]"
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
                    className="w-full h-9 px-3 rounded-lg bg-[#181e24] border border-[#2d3748] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#0082c9] font-mono"
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
                    className="w-full h-9 px-3 rounded-lg bg-[#181e24] border border-[#2d3748] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#0082c9] font-mono"
                  />
                </div>
              </div>

              {/* Canlı Parola Gücü & Entropi Ölçer */}
              {formData.password && (
                <div className="p-3 rounded-xl bg-[#181e24] border border-[#2d3748]">
                  <PasswordStrengthBar password={formData.password} />
                </div>
              )}

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
                    className="w-full h-9 px-3 rounded-lg bg-[#181e24] border border-[#2d3748] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#0082c9] font-mono"
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
                    className="w-full h-9 px-3 rounded-lg bg-[#181e24] border border-[#2d3748] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#0082c9] font-mono"
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
                  className="w-full p-2.5 rounded-lg bg-[#181e24] border border-[#2d3748] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#0082c9] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2d3748]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold shadow-sm transition-all"
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
          <div className="w-full max-w-md rounded-2xl bg-[#222933] border border-[#2d3748] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0082c9]/10 border border-[#0082c9]/20 flex items-center justify-center text-[#0082c9]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-100">Süper Parola Üretici</h3>
              </div>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Üretilen Parola Kartı */}
            <div className="p-4 rounded-xl bg-[#181e24] border border-[#2d3748] flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-[#0082c9] font-bold break-all">
                {generatedPassword}
              </span>
              <button
                onClick={() => copyToClipboard(generatedPassword, 'gen', 'Üretilen parola')}
                className="p-2 rounded-lg bg-[#0082c9]/10 hover:bg-[#0082c9]/20 text-[#0082c9] transition-colors shrink-0"
                title="Kopyala"
              >
                {copiedKey === 'gen' ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Canlı Parola Gücü & Entropi Barı */}
            <div className="p-3 rounded-xl bg-[#181e24] border border-[#2d3748]">
              <PasswordStrengthBar password={generatedPassword} />
            </div>

            {/* Seçenekler */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-mono">
                  <span>Uzunluk</span>
                  <span className="text-[#0082c9] font-bold">{genLength} Karakter</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={genLength}
                  onChange={(e) => setGenLength(Number(e.target.value))}
                  className="w-full accent-[#0082c9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-[#181e24] border border-[#2d3748] cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={genUppercase}
                    onChange={(e) => setGenUppercase(e.target.checked)}
                    className="accent-[#0082c9]"
                  />
                  <span>Büyük Harf (A-Z)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-[#181e24] border border-[#2d3748] cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={genNumbers}
                    onChange={(e) => setGenNumbers(e.target.checked)}
                    className="accent-[#0082c9]"
                  />
                  <span>Rakamlar (0-9)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-[#181e24] border border-[#2d3748] cursor-pointer col-span-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={genSymbols}
                    onChange={(e) => setGenSymbols(e.target.checked)}
                    className="accent-[#0082c9]"
                  />
                  <span>Özel Semboller (!@#$%^&*)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#2d3748]">
              <button
                onClick={generatePassword}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Tekrar Üret</span>
              </button>

              <button
                onClick={() => {
                  copyToClipboard(generatedPassword, 'gen');
                  setIsGeneratorOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold shadow-sm transition-all"
              >
                Kopyala & Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Kasa İçe / Dışa Aktar Modalı ─────────────────────── */}
      <PassImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        items={items}
        onImportSuccess={fetchItems}
        initialTab={importExportTab}
      />
    </div>
  );
}
