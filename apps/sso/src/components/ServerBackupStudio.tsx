"use client";

import React, { useState, useEffect } from "react";
import {
  Archive,
  Download,
  RotateCcw,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  X,
  FileArchive,
  ShieldAlert,
} from "lucide-react";
import { useGameStore } from "@/store/cockpit-store";
import { GAME_CATALOG } from "@/data/game-catalog";
import { useToast } from "@xivizley/aurora-ui";

interface BackupItem {
  filename: string;
  gameId: string;
  createdAt: string;
  sizeBytes: number;
  sizeFormatted: string;
  note?: string;
}

export function ServerBackupStudio() {
  const toast = useToast();
  const { activeGameId, isAdmin } = useGameStore();
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [backupNote, setBackupNote] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<BackupItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BackupItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const gameInfo = GAME_CATALOG[activeGameId] || { name: activeGameId };

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/server/backups?gameId=${activeGameId}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        setBackups(data.data);
      }
    } catch (err) {
      console.error("Yedekler yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [activeGameId]);

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("/api/server/backups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: activeGameId,
          note: backupNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "Yedek başarıyla oluşturuldu.");
        setIsCreateModalOpen(false);
        setBackupNote("");
        await fetchBackups();
      } else {
        toast.error(data.message || "Yedek oluşturulamadı.");
      }
    } catch (err: any) {
      toast.error(err.message || "Bağlantı hatası.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    setIsRestoring(true);
    try {
      const res = await fetch("/api/server/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: activeGameId,
          filename: restoreTarget.filename,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "Yedek geri yüklendi.");
        setRestoreTarget(null);
      } else {
        toast.error(data.message || "Geri yükleme başarısız.");
      }
    } catch (err: any) {
      toast.error(err.message || "Geri yükleme sırasında hata oluştu.");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/server/backups/${encodeURIComponent(deleteTarget.filename)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Yedek arşivi silindi.");
        setDeleteTarget(null);
        setBackups((prev) => prev.filter((b) => b.filename !== deleteTarget.filename));
      } else {
        toast.error(data.message || "Yedek silinemedi.");
      }
    } catch (err: any) {
      toast.error(err.message || "Silme hatası.");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalBytes = backups.reduce((acc, b) => acc + (b.sizeBytes || 0), 0);
  const totalFormatted = (totalBytes / 1024 / 1024).toFixed(1) + " MB";

  return (
    <div className="space-y-6">
      {/* ─── Header & Action Bar ──────────────────────────────── */}
      <div className="rounded-2xl border border-[#1e2a3c] bg-[#111824] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗄️</span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {gameInfo.name} — Yedekler & Felaket Kurtarma
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-semibold">
              GZ Sıkıştırma
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Sunucu dünyası, eklentiler ve konfigürasyon dosyaları tek tıkla zaman damgalı `.tar.gz` formatında arşivlenir.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchBackups}
            disabled={loading}
            className="p-2 rounded-xl bg-[#182333] hover:bg-[#1e2a3c] text-slate-300 hover:text-white border border-[#223044] transition-colors cursor-pointer"
            title="Listeyi Yenile"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-[#1AD76F] hover:bg-[#15b75e] text-black text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(26,215,111,0.2)] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Şimdi Yedek Oluştur</span>
          </button>
        </div>
      </div>

      {/* ─── Yedek İstatistik Özeti ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#111824] border border-[#1e2a3c]">
          <span className="text-xs font-semibold text-slate-400">Toplam Yedek Sayısı</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{backups.length}</span>
            <span className="text-xs text-slate-400">Arşiv</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111824] border border-[#1e2a3c]">
          <span className="text-xs font-semibold text-slate-400">Toplam Disk Tüketimi</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{totalFormatted}</span>
            <span className="text-xs text-slate-400">Arşiv Alanı</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111824] border border-[#1e2a3c]">
          <span className="text-xs font-semibold text-slate-400">Son Yedekleme Zamanı</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-bold text-slate-200">
              {backups[0] ? new Date(backups[0].createdAt).toLocaleString("tr-TR") : "Henüz yok"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Yedekler Tablosu / Listesi ───────────────────────── */}
      <div className="rounded-2xl border border-[#1e2a3c] bg-[#111824] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#1e2a3c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-[#1AD76F]" />
            <h3 className="text-sm font-bold text-white">Mevcut Arşivler</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Format: tar.gz</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#1AD76F] mb-2" />
            <p className="text-xs">Yedekler taranıyor...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileArchive className="h-10 w-10 text-slate-600 mx-auto" />
            <h4 className="text-base font-semibold text-slate-300">
              Bu oyun için henüz kaydedilmiş bir yedek yok
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Herhangi bir felaket durumunda dünyanızı kurtarabilmek için düzenli olarak yedek almanız önerilir.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1AD76F] text-black text-xs font-bold shadow-md hover:bg-[#15b75e] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>İlk Yedeği Başlat</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#1e2a3c]">
            {backups.map((b) => (
              <div
                key={b.filename}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#161f2e] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1e2a3c] border border-[#2a3a50] flex items-center justify-center shrink-0 text-emerald-400 font-bold">
                    <FileArchive className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-mono font-bold text-white break-all">
                      {b.filename}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(b.createdAt).toLocaleString("tr-TR")}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {b.sizeFormatted}
                      </span>
                      {b.note && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300 font-sans italic">"{b.note}"</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* İndir Butonu */}
                  <a
                    href={`/api/server/backups/download/${encodeURIComponent(b.filename)}`}
                    download
                    className="h-8 px-3 rounded-lg bg-[#182333] hover:bg-[#202d40] text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-[#2a3a50] transition-colors"
                    title="Yedeği bilgisayara indir"
                  >
                    <Download className="h-3.5 w-3.5 text-sky-400" />
                    <span>İndir</span>
                  </a>

                  {/* Geri Yükle Butonu */}
                  <button
                    onClick={() => setRestoreTarget(b)}
                    className="h-8 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-amber-500/30 transition-colors cursor-pointer"
                    title="Sunucuyu bu yedek durumuna geri döndür"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Geri Yükle</span>
                  </button>

                  {/* Sil Butonu */}
                  <button
                    onClick={() => setDeleteTarget(b)}
                    className="h-8 w-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 transition-colors cursor-pointer"
                    title="Bu yedeği kalıcı olarak sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Modal 1: Yedek Oluşturma ─────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-[#1e2a3c] bg-[#111824] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2a3c]">
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-[#1AD76F]" />
                <h3 className="text-base font-bold text-white">Yeni Sunucu Yedeği Al</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBackup} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Hedef Oyun: {gameInfo.name}
                </span>
                <p className="text-[11px] text-emerald-400/80">
                  Tüm dünya blokları, oyuncu envanterleri, eklenti konfigürasyonları ve veri tabanı dosyaları paketlenir.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Yedek Notu / Açıklaması (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="Örn: Eklenti güncellemesi öncesi, Nether sıfırlama, vb."
                  value={backupNote}
                  onChange={(e) => setBackupNote(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#090d14] border border-[#1e2a3c] text-white focus:outline-hidden focus:border-[#1AD76F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1e2a3c]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#182333] hover:bg-[#202d40] text-slate-300 font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-[#1AD76F] hover:bg-[#15b75e] text-black font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                  <span>{isCreating ? "Arşivleniyor..." : "Yedeklemeyi Başlat"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Geri Yükleme Güvenlik Onayı ──────────────── */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#16130e] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Yedekten Geri Yükleme Onayı</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white font-mono break-all">{restoreTarget.filename}</strong> arşivini geri yüklemek üzeresiniz.
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Önemli Uyarı:
              </span>
              <p className="text-[11px] text-amber-300/80">
                Bu işlem sunucudaki mevcut dünya ve eklenti verilerini arşivin oluşturulduğu tarihe döndürecektir. Geri yükleme sonrası sunucuyu yeniden başlatmanız gerekir.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-amber-500/20">
              <button
                type="button"
                onClick={() => setRestoreTarget(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isRestoring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                <span>{isRestoring ? "Geri Yükleniyor..." : "Evet, Geri Yükle"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal 3: Silme Güvenlik Onayı ────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#160f12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Yedeği Sil</h3>
            </div>

            <p className="text-xs text-slate-300">
              <strong className="text-white font-mono break-all">{deleteTarget.filename}</strong> arşivi diskten kalıcı olarak silinecek.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-rose-500/20">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>{isDeleting ? "Siliniyor..." : "Evet, Sil"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
