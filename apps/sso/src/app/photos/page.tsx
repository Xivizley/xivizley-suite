"use client";

import React, { useState, useEffect, useRef } from "react";
import { NextcloudHeader } from "@xivizley/aurora-ui";

interface MediaFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export default function PhotosPage() {
  const [mediaList, setMediaList] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPhotos = async () => {
    try {
      const res = await fetch("/api/photos");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setMediaList(json.data);
      }
    } catch (err) {
      console.error("Fotoğraflar yüklenemedi:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  // Fotoğraf Yükleme
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.ok) {
        await fetchPhotos();
      } else {
        alert(json.message || "Fotoğraf yüklenemedi.");
      }
    } catch (err) {
      console.error("Yükleme hatası:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredMedia = mediaList.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Lightbox sonraki / önceki
  const currentIndex = selectedMedia
    ? filteredMedia.findIndex((m) => m.id === selectedMedia.id)
    : -1;

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < filteredMedia.length - 1) {
      setSelectedMedia(filteredMedia[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedMedia(filteredMedia[currentIndex - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-[#181e24] text-slate-100 flex flex-col font-sans">
      <NextcloudHeader
        activeApp="photos"
        title="Fotoğraflar"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Fotoğraflarda ara..."
      />

      <main className="flex-1 flex flex-col p-4 sm:p-6 max-w-7xl mx-auto w-full overflow-y-auto">
        {/* Başlık ve Eylemler */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[#2d3748]">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#0082c9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span>Fotoğraflar & Medya Galerisi</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Drive alanınızdaki tüm görsel ve videolar otomatik olarak burada albümlenir.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 bg-[#222933] px-3 py-1.5 rounded-full border border-[#2d3748]">
              {filteredMedia.length} Medya Öğesi
            </span>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{isUploading ? "Yükleniyor..." : "Fotoğraf Yükle"}</span>
            </button>
          </div>
        </div>

        {/* Galeri Grid */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-slate-500 text-xs">
            Fotoğraflar taranıyor...
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-slate-500">
            <div className="w-16 h-16 rounded-2xl bg-[#222933] flex items-center justify-center text-slate-600 mb-3 border border-[#2d3748]">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-300">Henüz fotoğraf bulunmuyor</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Drive'a görsel veya video yüklediğinizde burada anında zaman tüneli olarak listelenecektir.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 rounded-lg bg-[#0082c9] text-white text-xs font-semibold hover:bg-[#006aa3] transition-colors"
            >
              İlk Fotoğrafı Yükle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-6">
            {filteredMedia.map((media) => {
              const isVideo = media.mimeType.startsWith("video/");
              return (
                <div
                  key={media.id}
                  onClick={() => setSelectedMedia(media)}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-[#222933] border border-[#2d3748] cursor-pointer hover:border-[#0082c9] transition-all shadow-sm"
                >
                  {isVideo ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-slate-400">
                      <svg className="w-10 h-10 text-white/80 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span className="text-[10px] mt-2 font-mono text-white/70">Video</span>
                    </div>
                  ) : (
                    <img
                      src={`/api/photos/${media.id}/stream`}
                      alt={media.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end">
                    <p className="text-white text-xs font-medium truncate">{media.name}</p>
                    <p className="text-slate-300 text-[10px]">
                      {new Date(media.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── FULLSCREEN LIGHTBOX MODAL ──────────────────────── */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4"
          onClick={() => setSelectedMedia(null)}
        >
          {/* Lightbox Üst Bar */}
          <div
            className="flex items-center justify-between text-white px-2 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-sm truncate max-w-md">{selectedMedia.name}</span>
              <span className="text-xs text-slate-400">
                ({(selectedMedia.sizeBytes / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/download/${selectedMedia.id}`}
                download={selectedMedia.name}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
              >
                İndir
              </a>
              <button
                onClick={() => setSelectedMedia(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Lightbox Görsel / Video Alanı */}
          <div
            className="flex-1 flex items-center justify-center p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {currentIndex > 0 && (
              <button
                onClick={handlePrev}
                className="absolute left-4 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white text-xl transition-all"
                title="Önceki"
              >
                ‹
              </button>
            )}

            {selectedMedia.mimeType.startsWith("video/") ? (
              <video
                src={`/api/photos/${selectedMedia.id}/stream`}
                controls
                autoPlay
                className="max-h-[80vh] max-w-[90vw] rounded-lg shadow-2xl"
              />
            ) : (
              <img
                src={`/api/photos/${selectedMedia.id}/stream`}
                alt={selectedMedia.name}
                className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              />
            )}

            {currentIndex < filteredMedia.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute right-4 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white text-xl transition-all"
                title="Sonraki"
              >
                ›
              </button>
            )}
          </div>

          {/* Lightbox Alt Bar */}
          <div className="text-center text-xs text-slate-400 py-2">
            {currentIndex + 1} / {filteredMedia.length}
          </div>
        </div>
      )}
    </div>
  );
}
