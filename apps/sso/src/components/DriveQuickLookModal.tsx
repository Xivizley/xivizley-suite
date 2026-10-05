"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  FileText,
  FileCode,
  Music,
  Video,
  File,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@xivizley/aurora-ui";

export interface DriveQuickLookFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

interface DriveQuickLookModalProps {
  file: DriveQuickLookFile | null;
  onClose: () => void;
  onShare?: (file: DriveQuickLookFile) => void;
}

export function DriveQuickLookModal({
  file,
  onClose,
  onShare,
}: DriveQuickLookModalProps) {
  const toast = useToast();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dosya türünü tespit et
  const ext = file?.name?.includes(".")
    ? file.name.split(".").pop()?.toLowerCase() || ""
    : "";
  const mime = file?.mimeType?.toLowerCase() || "";

  const isImage =
    mime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"].includes(ext);

  const isVideo =
    mime.startsWith("video/") ||
    ["mp4", "webm", "mkv", "mov", "avi"].includes(ext);

  const isAudio =
    mime.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "flac", "m4a", "aac"].includes(ext);

  const isPdf = mime === "application/pdf" || ext === "pdf";

  const isCodeOrText =
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    [
      "txt",
      "md",
      "json",
      "js",
      "ts",
      "tsx",
      "jsx",
      "sh",
      "bash",
      "log",
      "sql",
      "yaml",
      "yml",
      "html",
      "css",
      "py",
      "lua",
      "env",
      "ini",
      "conf",
      "properties",
    ].includes(ext);

  // Esc tuşu ile kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Metin / Kod içeriğini yükle
  useEffect(() => {
    if (!file || !isCodeOrText) {
      setTextContent(null);
      return;
    }

    setTextLoading(true);
    fetch(`/api/download/${file.id}?inline=true`)
      .then((res) => res.text())
      .then((text) => {
        setTextContent(text);
      })
      .catch((err) => {
        console.error("Metin önizlemesi yüklenemedi:", err);
        setTextContent("Dosya içeriği yüklenirken hata oluştu.");
      })
      .finally(() => {
        setTextLoading(false);
      });
  }, [file?.id, isCodeOrText]);

  // Yeni dosya açıldığında dönüşüm durumlarını sıfırla
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setCopied(false);
  }, [file?.id]);

  if (!file) return null;

  const downloadUrl = `/api/download/${file.id}`;
  const inlineUrl = `/api/download/${file.id}?inline=true`;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleCopyText = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    toast.success("Metin panoya kopyalandı!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative flex flex-col rounded-2xl border border-[#2d3748] bg-[#181e24] shadow-2xl transition-all duration-200 overflow-hidden ${
          isFullscreen
            ? "w-full h-full"
            : "w-full max-w-4xl max-h-[90vh] h-[750px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header Bar (macOS / Nextcloud Quick Look Tarzı) ──── */}
        <div className="h-14 px-4 sm:px-5 border-b border-[#2d3748] bg-[#222933] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#0082c9]/15 border border-[#0082c9]/30 flex items-center justify-center text-[#0082c9] shrink-0">
              {isImage ? (
                <Eye className="h-4 w-4" />
              ) : isCodeOrText ? (
                <FileCode className="h-4 w-4 text-emerald-400" />
              ) : isVideo ? (
                <Video className="h-4 w-4 text-purple-400" />
              ) : isAudio ? (
                <Music className="h-4 w-4 text-amber-400" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </div>

            <div className="overflow-hidden">
              <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {file.name}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span>{formatBytes(file.sizeBytes)}</span>
                <span>•</span>
                <span>
                  {new Date(file.createdAt).toLocaleDateString("tr-TR")}
                </span>
                <span>•</span>
                <span className="uppercase">{ext || "Bilinmiyor"}</span>
              </div>
            </div>
          </div>

          {/* Aksiyon Araç Çubuğu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isImage && (
              <>
                <button
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Yakınlaştır (+)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Uzaklaştır (-)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="90° Döndür"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
              </>
            )}

            {isCodeOrText && textContent && (
              <button
                onClick={handleCopyText}
                className="h-8 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                title="İçeriği kopyala"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                  {copied ? "Kopyalandı" : "Kopyala"}
                </span>
              </button>
            )}

            {onShare && (
              <button
                onClick={() => onShare(file)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Paylaşım Bağlantısı Oluştur"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}

            <a
              href={downloadUrl}
              download={file.name}
              className="h-8 px-3 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              title="Dosyayı İndir"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">İndir</span>
            </a>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? "Küçült" : "Tam Ekran"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 transition-colors cursor-pointer"
              title="Kapat (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ─── Preview Gövdesi ───────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-[#12161b] relative flex items-center justify-center p-4">
          {/* 1. Görsel Önizleme */}
          {isImage && (
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <img
                src={inlineUrl}
                alt={file.name}
                className="max-h-full max-w-full object-contain transition-transform duration-200 rounded-lg shadow-lg"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              />
            </div>
          )}

          {/* 2. Video Oynatıcı */}
          {isVideo && (
            <div className="w-full h-full flex items-center justify-center">
              <video
                src={inlineUrl}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-xl shadow-2xl"
              >
                Tarayıcınız video etiketini desteklemiyor.
              </video>
            </div>
          )}

          {/* 3. Ses Oynatıcı */}
          {isAudio && (
            <div className="p-8 rounded-2xl bg-[#1e2530] border border-[#2d3748] flex flex-col items-center gap-4 shadow-xl">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Music className="h-10 w-10 animate-pulse" />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-bold text-white">{file.name}</h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {formatBytes(file.sizeBytes)}
                </p>
              </div>
              <audio
                src={inlineUrl}
                controls
                className="w-72 sm:w-96"
                autoPlay
              />
            </div>
          )}

          {/* 4. PDF Görüntüleyici */}
          {isPdf && (
            <div className="w-full h-full rounded-xl overflow-hidden bg-white shadow-2xl">
              <iframe
                src={`${inlineUrl}#toolbar=1`}
                title={file.name}
                className="w-full h-full border-none"
              />
            </div>
          )}

          {/* 5. Metin & Kod Önizleyici */}
          {isCodeOrText &&
            (() => {
              const MAX_PREVIEW_LINES = 2000;
              const allLines = textContent ? textContent.split("\n") : [];
              const isTruncated = allLines.length > MAX_PREVIEW_LINES;
              const displayLines = isTruncated
                ? allLines.slice(0, MAX_PREVIEW_LINES)
                : allLines;

              return (
                <div className="w-full h-full flex flex-col rounded-xl border border-[#2d3748] bg-[#161a22] overflow-hidden">
                  {isTruncated && (
                    <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center justify-between shrink-0">
                      <span>
                        ⚠️ Dosya çok büyük ({allLines.length.toLocaleString()}{" "}
                        satır). Tarayıcı performansını korumak için ilk{" "}
                        {MAX_PREVIEW_LINES.toLocaleString()} satır gösteriliyor.
                      </span>
                      <a
                        href={downloadUrl}
                        download={file.name}
                        className="underline hover:text-white font-bold ml-2"
                      >
                        Tamamını İndir
                      </a>
                    </div>
                  )}
                  {textLoading ? (
                    <div className="m-auto flex flex-col items-center gap-2 text-slate-400">
                      <RefreshCw className="h-6 w-6 animate-spin text-[#0082c9]" />
                      <span className="text-xs">Dosya içeriği okunuyor...</span>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-200 leading-relaxed select-text">
                      <pre className="whitespace-pre-wrap break-all font-mono">
                        {displayLines.map((line, idx) => (
                          <div key={idx} className="table-row hover:bg-white/5">
                            <span className="table-cell pr-4 text-right select-none text-slate-500 font-mono text-[11px] w-12 border-r border-[#2d3748]/50">
                              {idx + 1}
                            </span>
                            <span className="table-cell pl-4">{line}</span>
                          </div>
                        ))}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* 6. Desteklenmeyen / Genel Dosya Kartı */}
          {!isImage && !isVideo && !isAudio && !isPdf && !isCodeOrText && (
            <div className="p-8 rounded-2xl bg-[#1e2530] border border-[#2d3748] flex flex-col items-center text-center max-w-sm space-y-4 shadow-xl">
              <div className="w-20 h-20 rounded-2xl bg-[#0082c9]/15 border border-[#0082c9]/30 flex items-center justify-center text-[#0082c9]">
                <File className="h-10 w-10" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white break-all">
                  {file.name}
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  {formatBytes(file.sizeBytes)} •{" "}
                  {file.mimeType || "Bilinmeyen Tür"}
                </p>
              </div>
              <p className="text-xs text-slate-300">
                Bu dosya formatı için tarayıcı içi doğrudan önizleme bulunmuyor.
                Dosyayı indirip cihazınızdaki varsayılan uygulama ile
                açabilirsiniz.
              </p>
              <a
                href={downloadUrl}
                download={file.name}
                className="px-5 py-2.5 rounded-xl bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all"
              >
                <Download className="h-4 w-4" />
                <span>Dosyayı İndir</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
