"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  HardDrive,
  File,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Download,
  Upload,
  ArrowRight,
  Clock,
  RefreshCw,
} from "lucide-react";

interface DriveFile {
  id: string;
  name: string;
  size: number;
  mimeType?: string;
  updatedAt?: string;
  createdAt?: string;
}

export function RecentFilesWidget() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecentFiles = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/files?filter=recent", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setFiles(json.data.slice(0, 5));
        }
      }
    } catch {
      // Graceful error fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentFiles();
  }, []);

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return "az önce";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dk önce`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} sa önce`;
    return `${Math.floor(diffSec / 86400)} gün önce`;
  };

  const getFileIcon = (mime?: string, name?: string) => {
    const ext = name?.split(".").pop()?.toLowerCase();
    if (mime?.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "")) {
      return <ImageIcon className="w-4 h-4 text-sky-400" />;
    }
    if (mime?.startsWith("video/") || ["mp4", "mkv", "webm"].includes(ext || "")) {
      return <Film className="w-4 h-4 text-purple-400" />;
    }
    if (mime?.startsWith("audio/") || ["mp3", "wav", "flac"].includes(ext || "")) {
      return <Music className="w-4 h-4 text-amber-400" />;
    }
    if (["zip", "tar", "gz", "rar", "7z"].includes(ext || "")) {
      return <Archive className="w-4 h-4 text-rose-400" />;
    }
    if (["txt", "md", "json", "ts", "js", "html", "css"].includes(ext || "")) {
      return <FileText className="w-4 h-4 text-emerald-400" />;
    }
    return <File className="w-4 h-4 text-slate-400" />;
  };

  // Hızlı dosya yükleme
  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    try {
      setIsUploading(true);
      const formData = new FormData();
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file) {
          formData.append("files", file);
        }
      }
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        await fetchRecentFiles();
      }
    } catch {}
    finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`rounded-xl border border-[#2d3748] bg-[#222933] p-5 flex flex-col justify-between space-y-4 shadow-sm relative transition-all ${
        isDragging ? "border-[#0082c9] bg-[#1a2330]" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleUploadFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUploadFiles(e.target.files)}
      />

      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0082c9]/20 text-[#0082c9] flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Son Dosyalar</h3>
              <p className="text-[10px] text-slate-400">Drive kişisel bulut depolamanız</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2b3442] transition-colors"
              title="Hızlı Dosya Yükle"
            >
              <Upload className={`w-3.5 h-3.5 ${isUploading ? "animate-bounce text-[#0082c9]" : ""}`} />
            </button>
            <button
              type="button"
              onClick={fetchRecentFiles}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2b3442] transition-colors"
              title="Yenile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Files List */}
        {isLoading && files.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <div className="w-5 h-5 border-2 border-[#0082c9] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Dosyalar yükleniyor...</span>
          </div>
        ) : files.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="py-8 text-center rounded-lg border border-dashed border-[#3b4758] bg-[#181e24] cursor-pointer hover:border-[#0082c9] transition-colors p-4"
          >
            <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-300">Henüz son dosya bulunmuyor</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Dosya yüklemek için buraya sürükleyin veya tıklayın
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2d3748]/60">
            {files.map((file) => (
              <div
                key={file.id}
                className="py-2.5 flex items-center justify-between gap-3 group hover:bg-[#2b3442]/40 rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded bg-[#181e24] border border-[#2d3748] flex items-center justify-center shrink-0">
                    {getFileIcon(file.mimeType, file.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate group-hover:text-white">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>{formatSize(file.size)}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(file.updatedAt || file.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={`/api/download/${file.id}`}
                  download={file.name}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#0082c9] hover:bg-[#181e24] transition-colors shrink-0"
                  title="İndir"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="pt-2 border-t border-[#2d3748]/60 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500 font-mono">
          {files.length} dosya listelendi
        </span>
        <Link
          href="/files"
          className="inline-flex items-center gap-1 text-[#0082c9] hover:text-[#38bdf8] font-medium transition-colors"
        >
          <span>Tüm Dosyalar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
