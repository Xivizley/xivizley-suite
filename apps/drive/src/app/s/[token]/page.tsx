"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Spinner } from "@xivizley/aurora-ui";

interface ShareData {
  token: string;
  expiresAt: string | null;
  allowDownload: boolean;
  file: {
    name: string;
    sizeBytes: number;
    mimeType: string;
    createdAt: string;
  } | null;
}

export default function PublicSharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);

  useEffect(() => {
    if (!token) return;

    fetch(`/api/shares/public/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(
            json.message || "Paylaşım bağlantısı geçersiz veya süresi dolmuş.",
          );
        }
        setShareData(json.data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const isImage = shareData?.file?.mimeType?.startsWith("image/");

  return (
    <div className="min-h-screen w-screen bg-[#181e24] text-slate-100 flex flex-col font-sans">
      {/* ─── Nextcloud Signature Header ─────────────────── */}
      <header className="h-14 bg-[#0082c9] text-white px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shadow-inner">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
            </svg>
          </div>
          <span className="font-bold text-base tracking-tight">
            XIVIZLEY{" "}
            <span className="font-normal text-white/90 text-sm">
              • Drive Paylaşım
            </span>
          </span>
        </div>
        <a
          href="https://suite.xivizley.com.tr"
          className="text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors font-medium"
        >
          XIVIZLEY Suite'e Git ↗
        </a>
      </header>

      {/* ─── Ana İçerik Kartı ───────────────────────────── */}
      <main className="flex-1 flex items-center justify-center p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" color="cyan" />
            <span className="text-xs text-slate-400">
              Paylaşılan dosya aranıyor...
            </span>
          </div>
        ) : error ? (
          <div className="max-w-md w-full bg-[#222933] border border-rose-900/50 rounded-2xl p-8 text-center shadow-xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-white">Bağlantı Geçersiz</h2>
            <p className="text-xs text-slate-400">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                (window.location.href = "https://drive.xivizley.com.tr")
              }
              className="mt-4"
            >
              Drive Ana Sayfasına Dön
            </Button>
          </div>
        ) : shareData?.file ? (
          <div className="max-w-lg w-full bg-[#222933] border border-[#2d3748] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4 border-b border-[#2d3748] pb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#0082c9]/15 border border-[#0082c9]/30 flex items-center justify-center text-3xl shrink-0">
                {isImage ? "🖼️" : "📄"}
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  className="text-base sm:text-lg font-bold text-white truncate"
                  title={shareData.file.name}
                >
                  {shareData.file.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>{formatBytes(shareData.file.sizeBytes)}</span>
                  <span>•</span>
                  <span>{shareData.file.mimeType}</span>
                </div>
              </div>
            </div>

            {/* Resim ise Önizleme */}
            {isImage && (
              <div className="rounded-xl overflow-hidden border border-[#2d3748] bg-[#181e24] flex items-center justify-center max-h-80">
                <img
                  src={`/api/download/public/${token}`}
                  alt={shareData.file.name}
                  className="max-h-80 object-contain w-auto"
                />
              </div>
            )}

            {/* İndirme Butonu */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`/api/download/public/${token}`}
                download={shareData.file.name}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#0082c9] text-white font-semibold hover:bg-[#006aa3] transition-all shadow-md text-sm"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>
                  Dosyayı İndir ({formatBytes(shareData.file.sizeBytes)})
                </span>
              </a>
            </div>

            <p className="text-[11px] text-center text-slate-400">
              Bu dosya XIVIZLEY NVMe Bulut Depolama üzerinde güvenle
              barındırılmaktadır.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
