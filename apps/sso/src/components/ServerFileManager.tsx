"use client";

import { useState, useEffect, useMemo } from "react";
import { useGameStore } from "@/store/cockpit-store";
import { GAME_CATALOG } from "@/data/game-catalog";

export interface ContainerFileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  extension: string;
  isEditable: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getFileIcon(item: ContainerFileItem) {
  if (item.type === "dir") return "📁";
  switch (item.extension) {
    case "properties":
    case "yml":
    case "yaml":
    case "toml":
    case "cfg":
    case "ini":
    case "conf":
      return "⚙️";
    case "json":
      return "📜";
    case "log":
    case "txt":
      return "📋";
    case "jar":
      return "☕";
    case "zip":
    case "gz":
    case "tar":
      return "📦";
    default:
      return "📄";
  }
}

export function ServerFileManager() {
  const { activeGameId } = useGameStore();
  const game = GAME_CATALOG[activeGameId] || GAME_CATALOG.minecraft;

  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<ContainerFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Editör State'leri
  const [editingFile, setEditingFile] = useState<ContainerFileItem | null>(
    null,
  );
  const [fileContent, setFileContent] = useState("");
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Klasör içeriğini yükle
  const loadFiles = async (folderPath = "") => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/server/files?gameId=${activeGameId}&path=${encodeURIComponent(folderPath)}`,
      );
      const data = await res.json();
      if (res.ok && data.ok) {
        setFiles(data.files || []);
        setCurrentPath(data.currentPath || "");
      } else {
        setError(data.message || "Dosyalar listelenemedi.");
      }
    } catch (err: any) {
      setError(err.message || "Sunucuyla bağlantı kurulamadı.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles("");
    setEditingFile(null);
  }, [activeGameId]);

  // Dosya içeriğini yükle ve editörü aç
  const handleOpenFile = async (item: ContainerFileItem) => {
    if (!item.isEditable) return;
    setEditingFile(item);
    setIsContentLoading(true);
    setSaveStatus(null);
    try {
      const res = await fetch(
        `/api/server/files/content?gameId=${activeGameId}&path=${encodeURIComponent(item.path)}`,
      );
      const data = await res.json();
      if (res.ok && data.ok) {
        setFileContent(data.content || "");
      } else {
        setSaveStatus({
          ok: false,
          message: data.message || "Dosya okunamadı.",
        });
      }
    } catch (err: any) {
      setSaveStatus({ ok: false, message: err.message || "Dosya okunamadı." });
    } finally {
      setIsContentLoading(false);
    }
  };

  // Dosyayı kaydet
  const handleSaveFile = async (restart = false) => {
    if (!editingFile) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch("/api/server/files/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: activeGameId,
          path: editingFile.path,
          content: fileContent,
          restart,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSaveStatus({
          ok: true,
          message: restart
            ? "✅ Kaydedildi ve sunucu yeniden başlatıldı!"
            : "✅ Değişiklikler başarıyla kaydedildi.",
        });
        loadFiles(currentPath);
      } else {
        setSaveStatus({
          ok: false,
          message: data.message || "Kayıt başarısız.",
        });
      }
    } catch (err: any) {
      setSaveStatus({ ok: false, message: err.message || "Bağlantı hatası." });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  // Filtrelenmiş dosyalar
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.extension.toLowerCase().includes(q),
    );
  }, [files, searchQuery]);

  // Breadcrumb parçaları
  const breadcrumbs = useMemo(() => {
    if (!currentPath) return [];
    return currentPath.split("/").filter(Boolean);
  }, [currentPath]);

  const navigateBreadcrumb = (index: number) => {
    const nextParts = breadcrumbs.slice(0, index + 1);
    loadFiles(nextParts.join("/"));
  };

  return (
    <div className="flex flex-col gap-4 p-5 bg-[#0e141f] border border-[#1c2838] rounded-2xl shadow-sm text-slate-100">
      {/* Üst Başlık & Araç Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1c2838]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📂</span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {game.name} Dosya Yöneticisi
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#1AD76F]/15 text-[#1AD76F] border border-[#1AD76F]/30 font-bold">
              {game.volumeMountPath}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Sunucu yapılandırmalarını, eklenti ayarlarını ve logları doğrudan
            tarayıcıdan düzenleyin.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => loadFiles(currentPath)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-[#141d2a] border border-[#1f2d40] hover:border-[#1AD76F]/50 text-xs text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>🔄</span> Yenile
          </button>
        </div>
      </div>

      {/* Breadcrumb & Arama Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#111824] border border-[#1c2838]">
        {/* Yol Navigasyonu */}
        <div className="flex items-center gap-1 text-xs font-mono overflow-x-auto py-1 scrollbar-none">
          <button
            type="button"
            onClick={() => loadFiles("")}
            className="px-2 py-1 rounded bg-[#182333] text-[#1AD76F] hover:bg-[#1AD76F]/20 transition-colors flex items-center gap-1 shrink-0 cursor-pointer font-bold"
          >
            <span>🏠</span> root ({game.volumeMountPath})
          </button>

          {breadcrumbs.map((part, idx) => (
            <div key={idx} className="flex items-center gap-1 shrink-0">
              <span className="text-slate-500">/</span>
              <button
                type="button"
                onClick={() => navigateBreadcrumb(idx)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  idx === breadcrumbs.length - 1
                    ? "bg-[#1AD76F] text-black font-extrabold"
                    : "bg-[#182333] text-slate-300 hover:text-white"
                }`}
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        {/* Arama Kutusu */}
        <div className="relative w-full sm:w-60">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Dosya veya klasör ara..."
            className="w-full bg-[#162232] border border-[#223348] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#1AD76F]"
          />
        </div>
      </div>

      {/* Hata Mesajı */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => loadFiles(currentPath)}
            className="underline text-[11px] cursor-pointer"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* İki Panel: Sol Dosya Listesi, Sağ (Varsa) Canlı Kod Editörü */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Dosya Tablosu */}
        <div
          className={`w-full ${editingFile ? "lg:col-span-5" : "lg:col-span-12"}`}
        >
          <div className="rounded-xl border border-[#2d3748] bg-[#181e24] overflow-hidden">
            <div className="px-3.5 py-2 border-b border-[#2d3748] bg-[#1e252d] flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span>İsim ({filteredFiles.length} öğe)</span>
              <span>Boyut</span>
            </div>

            <div className="max-h-[500px] overflow-y-auto divide-y divide-[#2d3748]/60">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <span className="animate-spin text-lg">⏳</span> Dosyalar
                  taranıyor...
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Bu klasörde görüntülenecek dosya yok.
                </div>
              ) : (
                filteredFiles.map((item) => {
                  const isCurrentEditing = editingFile?.path === item.path;
                  return (
                    <div
                      key={item.path}
                      onClick={() => {
                        if (item.type === "dir") {
                          if (item.name === "..") {
                            const parentParts = breadcrumbs.slice(0, -1);
                            loadFiles(parentParts.join("/"));
                          } else {
                            loadFiles(item.path);
                          }
                        } else if (item.isEditable) {
                          handleOpenFile(item);
                        }
                      }}
                      className={`px-3.5 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer select-none ${
                        isCurrentEditing
                          ? "bg-[#1AD76F]/15 border-l-2 border-[#1AD76F] text-white font-semibold"
                          : "hover:bg-[#141d2a] text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0">
                          {getFileIcon(item)}
                        </span>
                        <span
                          className={`truncate font-mono ${
                            item.type === "dir"
                              ? "font-bold text-[#1AD76F]"
                              : ""
                          }`}
                        >
                          {item.name}
                        </span>
                        {item.isEditable && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1AD76F]/10 text-[#1AD76F] border border-[#1AD76F]/30 shrink-0">
                            Düzenlenebilir
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-2">
                        {item.type === "dir"
                          ? "Klasör"
                          : formatBytes(item.size)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Canlı Kod / Konfigürasyon Editörü */}
        {editingFile && (
          <div className="lg:col-span-7 w-full flex flex-col gap-2 p-4 rounded-xl bg-[#0e141f] border border-[#1c2838]">
            <div className="flex items-center justify-between pb-2 border-b border-[#1c2838]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">
                  {getFileIcon(editingFile)}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-xs font-bold text-white truncate">
                    {editingFile.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 truncate">
                    {editingFile.path} ({formatBytes(editingFile.size)})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingFile(null)}
                  className="px-2.5 py-1 rounded-lg bg-[#182333] hover:bg-slate-700 text-slate-300 text-xs cursor-pointer border border-[#273850]"
                >
                  ✕ Kapat
                </button>
              </div>
            </div>

            {/* Metin Editör Alanı */}
            <div className="relative">
              {isContentLoading ? (
                <div className="h-96 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                  <span className="animate-spin text-lg">⏳</span> Dosya içeriği
                  yükleniyor...
                </div>
              ) : (
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  rows={20}
                  className="w-full bg-[#0a0f16] border border-[#1d2a3c] rounded-xl p-3 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-[#1AD76F] resize-y selection:bg-[#1AD76F]/30"
                  spellCheck={false}
                />
              )}
            </div>

            {/* Kaydetme Butonları & Feedback */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[#1c2838]">
              <div className="text-[11px] font-mono text-slate-400">
                {fileContent.split("\n").length} satır •{" "}
                {formatBytes(new Blob([fileContent]).size)}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isSaving || isContentLoading}
                  onClick={() => handleSaveFile(false)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#1AD76F] text-black text-xs font-extrabold hover:bg-[#18c465] shadow-[0_0_12px_rgba(26,215,111,0.25)] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSaving ? "⏳ Kaydediliyor..." : "💾 Kaydet"}
                </button>

                <button
                  type="button"
                  disabled={isSaving || isContentLoading}
                  onClick={() => handleSaveFile(true)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#182333] hover:bg-[#202e42] text-white border border-[#273850] text-xs font-bold disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  title="Dosyayı kaydeder ve değişikliklerin geçerli olması için konteyneri yeniden başlatır."
                >
                  ⚡ Kaydet & Yeniden Başlat
                </button>
              </div>
            </div>

            {saveStatus && (
              <div
                className={`p-2 rounded-lg text-xs text-center font-mono ${
                  saveStatus.ok
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/15 border border-rose-500/30 text-rose-300"
                }`}
              >
                {saveStatus.message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
