"use client";

import { useState, useEffect, useRef } from "react";
import { Card, Button, Input, Modal, Badge } from "@xivizley/aurora-ui";

interface DriveFolder {
  id: string;
  name: string;
  color?: string | null;
  createdAt: string;
}

interface DriveItemFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export default function DrivePage() {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveItemFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFileForOffice, setSelectedFileForOffice] = useState<DriveItemFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dosya ve klasörleri yükle
  const fetchItems = async (folderId: string | null = currentFolderId) => {
    try {
      const url = folderId ? `/api/files?folder_id=${folderId}` : "/api/files";
      const res = await fetch(url);
      const json = await res.json();
      if (json.ok) {
        setFolders(json.data.folders);
        setFiles(json.data.files);
      }
    } catch {
      // Hata durumunda sessiz kal
    }
  };

  useEffect(() => {
    fetchItems(currentFolderId);
  }, [currentFolderId]);

  // Dosya Yükleme İşlemi (Fastify Stream)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFiles[0]!);
    if (currentFolderId) {
      formData.append("folder_id", currentFolderId);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.ok) {
        await fetchItems(currentFolderId);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Yeni Klasör Oluşturma
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parent_id: currentFolderId,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setIsCreateFolderOpen(false);
        setNewFolderName("");
        await fetchItems(currentFolderId);
      }
    } catch {
      // Hata
    }
  };

  // Dosya Boyutu Formatlayıcı
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
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

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      {/* Üst Bar: Başlık, Arama ve Yükleme Aksiyonları */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-aurora aurora-glass border border-aurora">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-aurora-surface border border-aurora-cyan/30 flex items-center justify-center text-aurora-cyan shadow-aurora-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-aurora-text-primary flex items-center gap-2">
              XIVIZLEY Drive
              <Badge variant="cyan" size="sm">
                Nextcloud Katili
              </Badge>
            </h1>
            <p className="text-xs text-aurora-text-muted font-mono">
              Zero-Copy Stream | NVMe Hızı | Microsoft Office Entegre
            </p>
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex items-center gap-2.5">
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
            leftIcon={
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
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
            leftIcon={
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V10.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z" />
              </svg>
            }
          >
            {isUploading ? "Yükleniyor..." : "Dosya Yükle"}
          </Button>
        </div>
      </header>

      {/* Navigasyon / Klasör Ağacı Yolu (Breadcrumbs) */}
      {currentFolderId && (
        <div className="flex items-center gap-2 text-xs text-aurora-text-secondary">
          <button
            onClick={() => setCurrentFolderId(null)}
            className="hover:text-aurora-cyan transition-colors"
          >
            Ana Dizin
          </button>
          <span>/</span>
          <span className="text-aurora-text-primary font-semibold">Klasör</span>
        </div>
      )}

      {/* Klasörler Alanı */}
      {folders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-aurora-text-muted uppercase tracking-wider">
            Klasörler ({folders.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map((f) => (
              <div
                key={f.id}
                onClick={() => setCurrentFolderId(f.id)}
                className="p-3 rounded-aurora aurora-glass border border-aurora hover:border-aurora-cyan/50 hover:shadow-aurora-sm cursor-pointer transition-all flex items-center gap-2.5 select-none"
              >
                <span className="text-aurora-cyan text-lg">📁</span>
                <span className="text-xs font-medium text-aurora-text-primary truncate">
                  {f.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dosyalar Listesi */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-aurora-text-muted uppercase tracking-wider">
          Dosyalar ({files.length})
        </h2>

        {files.length === 0 && folders.length === 0 ? (
          <Card variant="outlined" className="p-12 text-center text-aurora-text-muted text-xs">
            Bu klasör bomboş. Yukarıdaki butonla ilk dosyanı yükle veya sürükle bırak!
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file) => {
              const isOffice = isOfficeFile(file.name);

              return (
                <Card
                  key={file.id}
                  variant="neon"
                  className="p-4 hover:border-aurora-glow transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xl">
                        {isOffice ? "📑" : file.mimeType.includes("image") ? "🖼️" : "📄"}
                      </span>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-aurora-text-primary truncate">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-aurora-text-muted">
                          {formatBytes(file.sizeBytes)}
                        </p>
                      </div>
                    </div>

                    {isOffice && (
                      <Badge variant="purple" size="sm">
                        Office
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-aurora text-xs">
                    {isOffice ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[11px] h-7 px-2 text-aurora-purple hover:text-aurora-text-primary"
                        onClick={() => setSelectedFileForOffice(file)}
                      >
                        Office'te Aç
                      </Button>
                    ) : (
                      <span className="text-[10px] text-aurora-text-muted">
                        {new Date(file.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                    )}

                    <a
                      href={`/api/download/${file.id}`}
                      download={file.name}
                      className="text-aurora-cyan hover:underline text-[11px] font-medium"
                    >
                      İndir
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Yeni Klasör Oluşturma Modalı */}
      <Modal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        title="Yeni Klasör Oluştur"
        description="Dosyalarını düzenlemek için bir klasör ismi belirle."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsCreateFolderOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateFolder}>
              Oluştur
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateFolder}>
          <Input
            label="Klasör Adı"
            placeholder="Örn: GTA V Modları, Belgelerim"
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
        <div className="w-full h-[550px] rounded-aurora bg-aurora-bg-dark border border-aurora flex flex-col items-center justify-center text-center p-6 space-y-3">
          <span className="text-4xl">📑</span>
          <h3 className="text-sm font-semibold text-aurora-text-primary">
            Microsoft Office Dokümanı Hazır
          </h3>
          <p className="text-xs text-aurora-text-muted max-w-md">
            {selectedFileForOffice?.name} dosyası OnlyOffice / LibreOffice web motoru üzerinden
            tam düzenleme modunda açılmaya hazır.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => window.open(`/api/download/${selectedFileForOffice?.id}`, "_blank")}
            >
              Dosyayı İndir & Yerel Aç
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
    </div>
  );
}
