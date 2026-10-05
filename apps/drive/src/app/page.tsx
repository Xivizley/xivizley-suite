"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button, Input, Modal, NextcloudHeader } from "@xivizley/aurora-ui";

interface DriveFolder {
  id: string;
  name: string;
  color?: string | null;
  isFavorite?: boolean;
  createdAt: string;
}

interface DriveItemFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  isFavorite?: boolean;
  isTrashed?: boolean;
  trashedAt?: string | null;
  createdAt: string;
}

export default function DrivePage() {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveItemFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFileForOffice, setSelectedFileForOffice] =
    useState<DriveItemFile | null>(null);
  const [selectedItem, setSelectedItem] = useState<{
    type: "file" | "folder";
    data: DriveItemFile | DriveFolder;
  } | null>(null);
  const [activeNav, setActiveNav] = useState<
    "all" | "recent" | "favorites" | "shares" | "trash"
  >("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Çoklu Dosya Seçimi & Paylaşım Bağlantısı Durumları
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [shareModalFile, setShareModalFile] = useState<DriveItemFile | null>(
    null,
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dosya ve klasörleri API'den yükle (activeNav ve currentFolderId'ye göre)
  const fetchItems = async (
    folderId: string | null = currentFolderId,
    nav: string = activeNav,
  ) => {
    try {
      const params = new URLSearchParams();
      if (folderId && nav === "all") {
        params.set("folder_id", folderId);
      }
      params.set("filter", nav);

      const res = await fetch(`/api/files?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setFolders(json.data.folders || []);
        setFiles(json.data.files || []);
      } else {
        console.warn("Veriler yüklenirken uyarı:", json.message);
      }
    } catch (err) {
      console.error("fetchItems hatası:", err);
    }
  };

  useEffect(() => {
    fetchItems(currentFolderId, activeNav);
  }, [currentFolderId, activeNav]);

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Dosya Yükleme İşlemi (Fastify Stream)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFiles[0]!);
    if (currentFolderId && activeNav === "all") {
      formData.append("folder_id", currentFolderId);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.ok) {
        showNotification(`"${selectedFiles[0]!.name}" başarıyla yüklendi.`);
        await fetchItems(currentFolderId, activeNav);
      } else {
        alert(json.message || "Dosya yüklenemedi.");
      }
    } catch (err: any) {
      alert(
        "Dosya yüklenirken hata oluştu: " + (err?.message || "Bağlantı hatası"),
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Yeni Klasör Oluşturma
  const handleCreateFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parent_id: activeNav === "all" ? currentFolderId : null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setIsCreateFolderOpen(false);
        const folderName = newFolderName.trim();
        setNewFolderName("");
        showNotification(`"${folderName}" klasörü oluşturuldu.`);
        await fetchItems(currentFolderId, activeNav);
      } else {
        alert(json.message || "Klasör oluşturulamadı.");
      }
    } catch (err: any) {
      alert("Klasör oluşturma hatası: " + (err?.message || "Bağlantı hatası"));
    }
  };

  // Çoklu Seçim Eylemleri
  const handleToggleSelectFile = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFileIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    );
  };

  const handleSelectAllFiles = () => {
    if (selectedFileIds.length === filteredFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(filteredFiles.map((f) => f.id));
    }
  };

  const handleBatchDownloadZip = async () => {
    if (selectedFileIds.length === 0) return;
    try {
      showNotification("ZIP arşivi paketleniyor...");
      const res = await fetch("/api/download/batch-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: selectedFileIds }),
      });
      if (!res.ok) throw new Error("İndirme başarısız");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `xivizley-drive-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotification("ZIP arşivi başarıyla indirildi.");
    } catch {
      showNotification("Toplu indirme sırasında bir hata oluştu.");
    }
  };

  const handleBatchTrash = async () => {
    if (selectedFileIds.length === 0) return;
    try {
      for (const id of selectedFileIds) {
        await fetch(`/api/files/${id}`, { method: "DELETE" });
      }
      showNotification(`${selectedFileIds.length} dosya çöp kutusuna taşındı.`);
      setSelectedFileIds([]);
      await fetchItems(currentFolderId, activeNav);
    } catch {
      showNotification("Dosyalar silinirken hata oluştu.");
    }
  };

  // Paylaşım Bağlantısı Modalı Açma
  const handleOpenShareModal = async (
    file: DriveItemFile,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setShareModalFile(file);
    setShareUrl(null);
    setCopiedShare(false);
    setIsCreatingShare(true);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, expiresInDays: 7 }),
      });
      const json = await res.json();
      if (json.ok) {
        setShareUrl(json.data.shareUrl);
      }
    } catch {
      showNotification("Paylaşım bağlantısı oluşturulamadı.");
    } finally {
      setIsCreatingShare(false);
    }
  };

  // Favori Ekle / Kaldır
  const handleToggleFavorite = async (
    file: DriveItemFile,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/files/${file.id}/favorite`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.ok) {
        showNotification(
          file.isFavorite ? "Favorilerden kaldırıldı." : "Favorilere eklendi.",
        );
        await fetchItems(currentFolderId, activeNav);
      }
    } catch {}
  };

  // Çöp Kutusuna Taşı
  const handleTrashFile = async (file: DriveItemFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/files/${file.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        showNotification(`"${file.name}" çöp kutusuna taşındı.`);
        if (selectedItem?.data.id === file.id) setSelectedItem(null);
        await fetchItems(currentFolderId, activeNav);
      }
    } catch {}
  };

  // Çöpten Geri Yükle
  const handleRestoreFile = async (
    file: DriveItemFile,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/files/${file.id}/restore`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.ok) {
        showNotification(`"${file.name}" geri yüklendi.`);
        if (selectedItem?.data.id === file.id) setSelectedItem(null);
        await fetchItems(currentFolderId, activeNav);
      }
    } catch {}
  };

  // Kalıcı Olarak Sil
  const handlePermanentDelete = async (
    file: DriveItemFile,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    if (
      !confirm(
        `"${file.name}" dosyasını kalıcı olarak silmek istediğinizden emin misiniz?`,
      )
    )
      return;

    try {
      const res = await fetch(`/api/files/${file.id}/permanent`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.ok) {
        showNotification(`"${file.name}" kalıcı olarak silindi.`);
        if (selectedItem?.data.id === file.id) setSelectedItem(null);
        await fetchItems(currentFolderId, activeNav);
      }
    } catch {}
  };

  // Dosya Boyutu Formatlayıcı
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Office Dosyası mı Kontrolü (.docx, .xlsx, .pptx)
  const isOfficeFile = (fileName: string) => {
    const lower = fileName.toLowerCase();
    return (
      lower.endsWith(".docx") ||
      lower.endsWith(".xlsx") ||
      lower.endsWith(".pptx") ||
      lower.endsWith(".doc") ||
      lower.endsWith(".xls")
    );
  };

  // Arama Filtresi
  const filteredFolders = useMemo(() => {
    if (!searchQuery) return folders;
    return folders.filter((f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [folders, searchQuery]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    return files.filter((f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [files, searchQuery]);

  const handleOpenFolder = (folder: DriveFolder) => {
    setCurrentFolderId(folder.id);
    setCurrentFolderName(folder.name);
    setSelectedItem(null);
  };

  const handleGoHome = () => {
    setCurrentFolderId(null);
    setCurrentFolderName(null);
    setSelectedItem(null);
  };

  const totalUsedBytes = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
  }, [files]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#181e24] text-slate-100 overflow-hidden font-sans">
      {/* ─── Signature Nextcloud Header Bar ─────────────────── */}
      <NextcloudHeader
        activeApp="drive"
        title="Dosyalar"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Dosyalarda ara... (Cmd+K)"
        rightActions={
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateFolderOpen(true)}
              className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white border-transparent"
              leftIcon={
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M.5 3l.04.87a1.99 1.99 0 0 0-.342 1.311l.637 7A2 2 0 0 0 2.826 14H9v-1H2.826a1 1 0 0 1-.995-.91l-.637-7A1 1 0 0 1 2.19 4h11.62a1 1 0 0 1 .996 1.09l-.637 7a1 1 0 0 1-.995.91H11v1h2.174a2 2 0 0 0 1.99-1.819l.637-7a1.99 1.99 0 0 0-.342-1.31L15.5 3H9.414L7.707 1.293A1 1 0 0 0 7 1H2a2 2 0 0 0-2 2h.5z" />
                  <path d="M13.5 10v-1.5a.5.5 0 0 0-1 0V10H11a.5.5 0 0 0 0 1h1.5v1.5a.5.5 0 0 0 1 0V11H15a.5.5 0 0 0 0-1h-1.5z" />
                </svg>
              }
            >
              Yeni Klasör
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-xs bg-white text-[#0082c9] hover:bg-white/90 font-semibold shadow-sm"
              leftIcon={
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                  <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V10.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z" />
                </svg>
              }
            >
              {isUploading ? "Yükleniyor..." : "Yükle"}
            </Button>
          </div>
        }
      />

      {/* Bildirim Toast */}
      {statusMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#0082c9] text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span>✓</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ─── Nextcloud 2/3-Column Body Layout ───────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobil Backdrop */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 top-12 bg-black/60 z-30 md:hidden animate-in fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* SOL SIDEBAR: Nextcloud Gezinti & Depolama Bilgisi ─ */}
        <aside
          className={`w-60 bg-[#222933] border-r border-[#2d3748] flex flex-col justify-between shrink-0 select-none p-3 transition-transform duration-200 z-40 fixed inset-y-12 left-0 md:static md:translate-x-0 ${
            isMobileSidebarOpen
              ? "translate-x-0 shadow-2xl"
              : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Dosyalarım
              </span>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="md:hidden p-1 rounded-md text-slate-400 hover:text-white"
                aria-label="Kapat"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => {
                setActiveNav("all");
                handleGoHome();
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeNav === "all"
                  ? "bg-[#0082c9] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-[#2b3442]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-[#38bdf8]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>Tüm Dosyalar</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">
                {activeNav === "all" ? files.length : ""}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveNav("recent");
                handleGoHome();
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeNav === "recent"
                  ? "bg-[#0082c9] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-[#2b3442]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 14 14" />
                </svg>
                <span>Son Kullanılanlar</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveNav("favorites");
                handleGoHome();
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeNav === "favorites"
                  ? "bg-[#0082c9] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-[#2b3442]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-amber-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>Favoriler</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveNav("shares");
                handleGoHome();
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeNav === "shares"
                  ? "bg-[#0082c9] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-[#2b3442]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-emerald-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>Paylaşılanlar</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveNav("trash");
                handleGoHome();
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeNav === "trash"
                  ? "bg-[#0082c9] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-[#2b3442]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-rose-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Çöp Kutusu</span>
              </div>
            </button>
          </div>

          {/* Depolama Kotası Kartı */}
          <div className="p-3 rounded-xl bg-[#181e24] border border-[#2d3748] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Depolama Alanı</span>
              <span className="font-mono text-slate-200">
                {formatBytes(totalUsedBytes)} / 1 TB
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0082c9]"
                style={{
                  width: `${Math.max(Math.min((totalUsedBytes / (1024 * 1024 * 1024 * 1024)) * 100, 100), 2)}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              NVMe ZFS Depolama Havuzu
            </p>
          </div>
        </aside>

        {/* ORTA ALAN: Dosya & Klasör Listesi ─────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#181e24] overflow-hidden">
          {/* Gezinti & Breadcrumb Araç Çubuğu */}
          <div className="h-12 border-b border-[#2d3748] bg-[#222933]/50 px-4 sm:px-6 flex items-center justify-between shrink-0">
            {/* Breadcrumb Yolu */}
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setIsMobileSidebarOpen((p) => !p)}
                className="md:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#2b3442] -ml-2 mr-1"
                aria-label="Dosya Menüsü"
                title="Dosya Gezgini Menüsü"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              <button
                onClick={handleGoHome}
                className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5 text-[#0082c9]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                <span>
                  {activeNav === "all"
                    ? "Tüm Dosyalar"
                    : activeNav === "recent"
                      ? "Son Kullanılanlar"
                      : activeNav === "favorites"
                        ? "Favoriler"
                        : activeNav === "shares"
                          ? "Paylaşılanlar"
                          : "Çöp Kutusu"}
                </span>
              </button>

              {currentFolderName && activeNav === "all" && (
                <>
                  <span className="text-slate-500">/</span>
                  <span className="text-slate-100 font-semibold truncate max-w-[120px] sm:max-w-none">
                    {currentFolderName}
                  </span>
                </>
              )}
            </div>

            {/* Görünüm Değiştirici & Yeni Klasör Butonu */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#181e24] rounded-lg border border-[#2d3748] p-0.5">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-[#2b3442] text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Liste Görünümü"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-[#2b3442] text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Izgara Görünümü"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </button>
              </div>

              {activeNav === "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreateFolderOpen(true)}
                  className="h-8 text-xs"
                >
                  + Yeni Klasör
                </Button>
              )}
            </div>
          </div>

          {/* Çöp Kutusu Bilgilendirme Çubuğu */}
          {activeNav === "trash" && (
            <div className="bg-rose-950/40 border-b border-rose-900/60 px-4 py-2 text-xs text-rose-200 flex items-center justify-between">
              <span>
                🗑️ Çöp kutusundaki dosyalar silinene kadar burada saklanır.
              </span>
            </div>
          )}

          {/* Çoklu Seçim Aksiyon Çubuğu */}
          {selectedFileIds.length > 0 && (
            <div className="bg-[#0082c9]/15 border-b border-[#0082c9]/30 px-4 py-2 flex items-center justify-between text-xs animate-in fade-in-0 duration-150">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {selectedFileIds.length} dosya seçildi
                </span>
                <button
                  onClick={() => setSelectedFileIds([])}
                  className="text-slate-400 hover:text-white underline text-[11px] ml-2"
                >
                  Seçimi Temizle
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleBatchDownloadZip}
                  className="bg-[#0082c9] text-white hover:bg-[#006aa3] h-7 text-xs flex items-center gap-1.5"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Toplu İndir (.ZIP)</span>
                </Button>
                {activeNav !== "trash" && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleBatchTrash}
                    className="h-7 text-xs flex items-center gap-1.5"
                  >
                    <span>Çöp Kutusuna Taşı</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Dosya / Klasör İçeriği */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-[#2d3748] bg-[#222933]/30">
                <div className="w-12 h-12 rounded-full bg-[#222933] flex items-center justify-center text-slate-400 mb-3">
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-slate-200">
                  {activeNav === "trash"
                    ? "Çöp kutusu boş"
                    : activeNav === "favorites"
                      ? "Henüz favori dosya yok"
                      : "Bu klasör henüz boş"}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                  {activeNav === "trash"
                    ? "Silinen dosyalarınız burada listelenir."
                    : activeNav === "favorites"
                      ? "Önemli dosyalarınıza yıldız ekleyerek buradan kolayca erişebilirsiniz."
                      : "Yeni klasör oluşturarak veya sağ üstteki Yükle butonuyla dosya ekleyerek başlayabilirsiniz."}
                </p>
                {activeNav === "all" && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#0082c9] text-white hover:bg-[#006aa3]"
                  >
                    İlk Dosyanızı Yükleyin
                  </Button>
                )}
              </div>
            ) : viewMode === "list" ? (
              /* Nextcloud Klasik Tablo Görünümü */
              <div className="rounded-xl border border-[#2d3748] bg-[#222933] overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#181e24] text-slate-400 border-b border-[#2d3748] select-none">
                    <tr>
                      <th className="py-2.5 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={
                            filteredFiles.length > 0 &&
                            selectedFileIds.length === filteredFiles.length
                          }
                          onChange={handleSelectAllFiles}
                          className="rounded border-[#2d3748] text-[#0082c9] bg-[#181e24] cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-4 font-semibold">Ad</th>
                      <th className="py-2.5 px-4 font-semibold w-28">Boyut</th>
                      <th className="py-2.5 px-4 font-semibold w-36 hidden sm:table-cell">
                        Tarih
                      </th>
                      <th className="py-2.5 px-4 font-semibold w-48 text-right">
                        Eylemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d3748]/60">
                    {/* Klasörler */}
                    {filteredFolders.map((f) => (
                      <tr
                        key={f.id}
                        onClick={() =>
                          setSelectedItem({ type: "folder", data: f })
                        }
                        onDoubleClick={() => handleOpenFolder(f)}
                        className={`hover:bg-[#2b3442] cursor-pointer transition-colors group ${
                          selectedItem?.data.id === f.id
                            ? "bg-[#0082c9]/15"
                            : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 w-8"></td>
                        <td className="py-2.5 px-4 flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-[#0082c9] shrink-0"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenFolder(f);
                            }}
                            className="font-medium text-slate-100 hover:text-[#38bdf8] truncate"
                          >
                            {f.name}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 font-mono">
                          --
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 hidden sm:table-cell">
                          {new Date(f.createdAt).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenFolder(f);
                            }}
                            className="text-[#0082c9] hover:underline text-xs font-medium"
                          >
                            Aç
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Dosyalar */}
                    {filteredFiles.map((file) => {
                      const isOffice = isOfficeFile(file.name);
                      return (
                        <tr
                          key={file.id}
                          onClick={() =>
                            setSelectedItem({ type: "file", data: file })
                          }
                          className={`hover:bg-[#2b3442] cursor-pointer transition-colors group ${
                            selectedItem?.data.id === file.id
                              ? "bg-[#0082c9]/15"
                              : ""
                          }`}
                        >
                          <td
                            className="py-2.5 px-3 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedFileIds.includes(file.id)}
                              onChange={(e) =>
                                handleToggleSelectFile(file.id, e as any)
                              }
                              className="rounded border-[#2d3748] text-[#0082c9] bg-[#181e24] cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-4 flex items-center gap-3 truncate">
                            {/* Favori Yıldızı */}
                            {activeNav !== "trash" && (
                              <button
                                onClick={(e) => handleToggleFavorite(file, e)}
                                className={`text-sm transition-transform hover:scale-125 ${
                                  file.isFavorite
                                    ? "text-amber-400"
                                    : "text-slate-600 hover:text-amber-300"
                                }`}
                                title={
                                  file.isFavorite
                                    ? "Favorilerden kaldır"
                                    : "Favorilere ekle"
                                }
                              >
                                ★
                              </button>
                            )}

                            <span className="text-base shrink-0">
                              {isOffice
                                ? "📑"
                                : file.mimeType.includes("image")
                                  ? "🖼️"
                                  : "📄"}
                            </span>
                            <span className="font-medium text-slate-200 truncate group-hover:text-white">
                              {file.name}
                            </span>
                            {isOffice && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                                Office
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 font-mono">
                            {formatBytes(file.sizeBytes)}
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 hidden sm:table-cell">
                            {new Date(file.createdAt).toLocaleDateString(
                              "tr-TR",
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right space-x-2">
                            {activeNav === "trash" ? (
                              <>
                                <button
                                  onClick={(e) => handleRestoreFile(file, e)}
                                  className="text-emerald-400 hover:text-emerald-300 text-xs font-medium"
                                  title="Geri Yükle"
                                >
                                  Kurtar
                                </button>
                                <button
                                  onClick={(e) =>
                                    handlePermanentDelete(file, e)
                                  }
                                  className="text-rose-400 hover:text-rose-300 text-xs font-medium"
                                  title="Kalıcı Olarak Sil"
                                >
                                  Kalıcı Sil
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => handleOpenShareModal(file, e)}
                                  className="text-sky-400 hover:text-sky-300 text-xs font-medium"
                                  title="Paylaşım Bağlantısı Oluştur"
                                >
                                  Paylaş
                                </button>
                                {isOffice && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedFileForOffice(file);
                                    }}
                                    className="text-indigo-400 hover:text-indigo-300 text-xs font-medium"
                                  >
                                    Düzenle
                                  </button>
                                )}
                                <a
                                  href={`/api/download/${file.id}`}
                                  download={file.name}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[#0082c9] hover:underline text-xs font-medium"
                                >
                                  İndir
                                </a>
                                <button
                                  onClick={(e) => handleTrashFile(file, e)}
                                  className="text-slate-500 hover:text-rose-400 text-xs font-medium"
                                  title="Çöp Kutusuna Gönder"
                                >
                                  Sil
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Izgara Kart Görünümü (Grid) */
              <div className="space-y-6">
                {filteredFolders.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Klasörler ({filteredFolders.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {filteredFolders.map((f) => (
                        <div
                          key={f.id}
                          onClick={() =>
                            setSelectedItem({ type: "folder", data: f })
                          }
                          onDoubleClick={() => handleOpenFolder(f)}
                          className={`p-3 rounded-xl border border-[#2d3748] bg-[#222933] hover:border-[#0082c9]/50 hover:bg-[#2b3442] cursor-pointer transition-all flex items-center gap-2.5 select-none ${
                            selectedItem?.data.id === f.id
                              ? "ring-2 ring-[#0082c9] border-transparent"
                              : ""
                          }`}
                        >
                          <svg
                            className="w-5 h-5 text-[#0082c9] shrink-0"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <span className="text-xs font-medium text-slate-200 truncate">
                            {f.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredFiles.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Dosyalar ({filteredFiles.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {filteredFiles.map((file) => {
                        const isOffice = isOfficeFile(file.name);
                        return (
                          <div
                            key={file.id}
                            onClick={() =>
                              setSelectedItem({ type: "file", data: file })
                            }
                            className={`p-3.5 rounded-xl border border-[#2d3748] bg-[#222933] hover:border-[#0082c9]/50 hover:bg-[#2b3442] cursor-pointer transition-all flex flex-col justify-between h-32 select-none relative ${
                              selectedItem?.data.id === file.id
                                ? "ring-2 ring-[#0082c9] border-transparent"
                                : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-2xl">
                                {isOffice
                                  ? "📑"
                                  : file.mimeType.includes("image")
                                    ? "🖼️"
                                    : "📄"}
                              </span>
                              <div className="flex items-center gap-1">
                                {activeNav !== "trash" && (
                                  <button
                                    onClick={(e) =>
                                      handleToggleFavorite(file, e)
                                    }
                                    className={`text-xs ${file.isFavorite ? "text-amber-400" : "text-slate-600 hover:text-amber-300"}`}
                                  >
                                    ★
                                  </button>
                                )}
                                {isOffice && (
                                  <span className="px-1 py-0.2 rounded text-[9px] bg-indigo-500/20 text-indigo-300 font-medium">
                                    Office
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-200 truncate">
                                {file.name}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {formatBytes(file.sizeBytes)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* SAĞ DETAY PANELİ: Seçili Öğe Bilgisi (Nextcloud Sidebar) */}
        {selectedItem && (
          <>
            <div
              className="fixed inset-0 top-12 bg-black/50 z-30 md:hidden animate-in fade-in"
              onClick={() => setSelectedItem(null)}
            />
            <aside className="w-80 max-w-[85vw] bg-[#222933] border-l border-[#2d3748] p-4 flex flex-col justify-between shrink-0 overflow-y-auto animate-in slide-in-from-right-2 duration-150 fixed inset-y-12 right-0 z-40 md:static md:w-72">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#2d3748]">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Ayrıntılar
                  </h4>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#181e24]"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Önizleme İkonu & Adı */}
                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-[#181e24] border border-[#2d3748]">
                  <span className="text-4xl mb-2">
                    {selectedItem.type === "folder"
                      ? "📁"
                      : isOfficeFile((selectedItem.data as DriveItemFile).name)
                        ? "📑"
                        : "📄"}
                  </span>
                  <p className="text-sm font-semibold text-slate-100 break-all">
                    {selectedItem.data.name}
                  </p>
                  {selectedItem.type === "file" && (
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      {formatBytes(
                        (selectedItem.data as DriveItemFile).sizeBytes,
                      )}
                    </p>
                  )}
                </div>

                {/* Bilgiler Listesi */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#2d3748]/60">
                    <span className="text-slate-400">Tür:</span>
                    <span className="text-slate-200">
                      {selectedItem.type === "folder"
                        ? "Dizin"
                        : (selectedItem.data as DriveItemFile).mimeType ||
                          "Dosya"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2d3748]/60">
                    <span className="text-slate-400">Oluşturulma:</span>
                    <span className="text-slate-200">
                      {new Date(selectedItem.data.createdAt).toLocaleDateString(
                        "tr-TR",
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Aksiyonlar */}
              <div className="pt-4 border-t border-[#2d3748] space-y-2">
                {selectedItem.type === "file" && (
                  <>
                    {activeNav === "trash" ? (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          onClick={() =>
                            handleRestoreFile(
                              selectedItem.data as DriveItemFile,
                            )
                          }
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Dosyayı Geri Yükle
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          fullWidth
                          onClick={() =>
                            handlePermanentDelete(
                              selectedItem.data as DriveItemFile,
                            )
                          }
                          className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                          Kalıcı Olarak Sil
                        </Button>
                      </>
                    ) : (
                      <>
                        {isOfficeFile(
                          (selectedItem.data as DriveItemFile).name,
                        ) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            fullWidth
                            onClick={() =>
                              setSelectedFileForOffice(
                                selectedItem.data as DriveItemFile,
                              )
                            }
                            className="bg-indigo-600 hover:bg-indigo-700 text-white border-transparent"
                          >
                            Office'te Düzenle
                          </Button>
                        )}

                        <a
                          href={`/api/download/${(selectedItem.data as DriveItemFile).id}`}
                          download={selectedItem.data.name}
                          className="w-full flex items-center justify-center py-2 px-3 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold shadow-sm transition-colors"
                        >
                          Dosyayı İndir
                        </a>

                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          onClick={() =>
                            handleToggleFavorite(
                              selectedItem.data as DriveItemFile,
                            )
                          }
                          className="border-[#2d3748] text-slate-300 hover:text-white"
                        >
                          {(selectedItem.data as DriveItemFile).isFavorite
                            ? "★ Favorilerden Çıkar"
                            : "☆ Favorilere Ekle"}
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          fullWidth
                          onClick={() =>
                            handleTrashFile(selectedItem.data as DriveItemFile)
                          }
                          className="bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white border-rose-500/30"
                        >
                          Çöp Kutusuna Taşı
                        </Button>
                      </>
                    )}
                  </>
                )}

                {selectedItem.type === "folder" && (
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={() =>
                      handleOpenFolder(selectedItem.data as DriveFolder)
                    }
                    className="bg-[#0082c9] text-white hover:bg-[#006aa3]"
                  >
                    Klasöre Git
                  </Button>
                )}
              </div>
            </aside>
          </>
        )}
      </div>

      {/* Yeni Klasör Oluşturma Modalı */}
      <Modal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        title="Yeni Klasör Oluştur"
        description="Dosyalarınızı organize etmek için yeni bir dizin adı girin."
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateFolderOpen(false)}
            >
              İptal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleCreateFolder()}
              className="bg-[#0082c9] text-white hover:bg-[#006aa3]"
            >
              Klasör Oluştur
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <Input
            label="Klasör Adı"
            placeholder="Örn: Belgeler, Fotoğraflar, Sunucu Yedekleri"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            autoFocus
          />
        </form>
      </Modal>

      {/* Office Doküman Görüntüleyici Modalı */}
      <Modal
        isOpen={!!selectedFileForOffice}
        onClose={() => setSelectedFileForOffice(null)}
        title={`XIVIZLEY Office — ${selectedFileForOffice?.name}`}
        size="xl"
      >
        <div className="w-full h-[500px] rounded-xl bg-[#181e24] border border-[#2d3748] flex flex-col items-center justify-center text-center p-6 space-y-3">
          <span className="text-5xl">📑</span>
          <h3 className="text-base font-semibold text-slate-100">
            Microsoft Office & LibreOffice Web Editörü
          </h3>
          <p className="text-xs text-slate-400 max-w-md">
            {selectedFileForOffice?.name} dosyası OnlyOffice / LibreOffice
            motoru üzerinden tam düzenleme modunda açılmaya hazır.
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              size="sm"
              variant="primary"
              className="bg-[#0082c9] text-white hover:bg-[#006aa3]"
              onClick={() =>
                window.open(
                  `/api/download/${selectedFileForOffice?.id}`,
                  "_blank",
                )
              }
            >
              İndir & Yerel Olarak Aç
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelectedFileForOffice(null)}
            >
              Kapat
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Nextcloud Paylaşım Bağlantısı Modalı ─────────────── */}
      <Modal
        isOpen={!!shareModalFile}
        onClose={() => setShareModalFile(null)}
        title={`Bağlantı ile Paylaş — ${shareModalFile?.name}`}
        size="md"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShareModalFile(null)}
          >
            Kapat
          </Button>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          <p className="text-slate-300">
            Bu bağlantıya sahip olan herkes bu dosyayı doğrudan görüntüleyebilir
            ve indirebilir (7 gün geçerli).
          </p>

          {isCreatingShare ? (
            <div className="flex items-center gap-2 py-4 justify-center text-slate-400">
              <Spinner size="sm" color="cyan" />
              <span>Güvenli bağlantı oluşturuluyor...</span>
            </div>
          ) : shareUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-[#181e24] border border-[#2d3748] rounded-lg px-3 py-2 text-slate-200 font-mono text-xs select-all focus:outline-none focus:border-[#0082c9]"
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setCopiedShare(true);
                    setTimeout(() => setCopiedShare(false), 2500);
                  }}
                  className="bg-[#0082c9] text-white hover:bg-[#006aa3] shrink-0"
                >
                  {copiedShare ? "✓ Kopyalandı" : "Kopyala"}
                </Button>
              </div>

              <div className="p-3 bg-[#181e24] rounded-lg border border-[#2d3748] text-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Geçerlilik Süresi:</span>
                  <span className="text-slate-200">7 Gün</span>
                </div>
                <div className="flex justify-between">
                  <span>İzinler:</span>
                  <span className="text-slate-200">
                    Doğrudan İndirme ve Önizleme
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
