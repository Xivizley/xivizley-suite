"use client";

import React, { useState, useEffect, useRef } from "react";
import { NextcloudHeader } from "@xivizley/aurora-ui";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ["Tümü", "Genel", "Kişisel", "Projeler", "Sunucu & Altyapı"];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tümü");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">(
    "edit",
  );

  // Aktif not alanları
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [category, setCategory] = useState<string>("Genel");

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Notları API'den çek
  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setNotes(json.data);
        if (json.data.length > 0 && !activeNoteId) {
          selectNote(json.data[0]);
        }
      }
    } catch (err) {
      console.error("Notlar yüklenemedi:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const selectNote = (note: Note) => {
    setActiveNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
  };

  // Otomatik kaydetme (Debounced Auto-save)
  const triggerAutoSave = (
    newTitle: string,
    newContent: string,
    newCategory: string,
  ) => {
    if (!activeNoteId) return;
    setIsSaving(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/notes/${activeNoteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newTitle,
            content: newContent,
            category: newCategory,
          }),
        });
        const json = await res.json();
        if (json.ok && json.data) {
          setNotes((prev) =>
            prev.map((n) => (n.id === activeNoteId ? json.data : n)),
          );
        }
      } catch (err) {
        console.error("Not kaydedilemedi:", err);
      } finally {
        setIsSaving(false);
      }
    }, 600);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    triggerAutoSave(val, content, category);
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    triggerAutoSave(title, val, category);
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    triggerAutoSave(title, content, val);
  };

  // Yeni Not Oluştur
  const handleCreateNote = async () => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Başlıksız Not",
          content:
            "# Yeni Not\n\nBuraya notlarınızı Markdown formatında yazabilirsiniz...",
          category: selectedCategory === "Tümü" ? "Genel" : selectedCategory,
        }),
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setNotes((prev) => [json.data, ...prev]);
        selectNote(json.data);
      }
    } catch (err) {
      console.error("Yeni not açılamadı:", err);
    }
  };

  // Not Sil
  const handleDeleteNote = async (id: string) => {
    if (!confirm("Bu notu silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      const nextNotes = notes.filter((n) => n.id !== id);
      setNotes(nextNotes);
      if (nextNotes.length > 0 && nextNotes[0]) {
        selectNote(nextNotes[0]);
      } else {
        setActiveNoteId(null);
        setTitle("");
        setContent("");
      }
    } catch (err) {
      console.error("Not silinemedi:", err);
    }
  };

  // Favori Aç/Kapat
  const handleToggleFavorite = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/${id}/favorite`, { method: "POST" });
      const json = await res.json();
      if (json.ok && json.data) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, isFavorite: json.data.isFavorite } : n,
          ),
        );
      }
    } catch (err) {}
  };

  // Filtrelenmiş notlar
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      selectedCategory === "Tümü" || n.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const activeNote = notes.find((n) => n.id === activeNoteId);

  return (
    <div className="min-h-screen bg-[#181e24] text-slate-100 flex flex-col font-sans">
      <NextcloudHeader
        activeApp="notes"
        title="Notlar"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Notlarda ara..."
      />

      <div className="flex-1 flex overflow-hidden">
        {/* ─── SOL SÜTUN: Not Listesi & Kategoriler ─────────── */}
        <aside className="w-80 border-r border-[#2d3748] bg-[#1a202c] flex flex-col shrink-0">
          {/* Başlık & Yeni Butonu */}
          <div className="p-3 border-b border-[#2d3748] flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#0082c9]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
                <path d="M15 3v5h5" />
                <path d="M9 13h6" />
                <path d="M9 17h4" />
              </svg>
              <span>Notlarım</span>
              <span className="text-xs text-slate-500 font-normal">
                ({filteredNotes.length})
              </span>
            </h2>

            <button
              onClick={handleCreateNote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Yeni Not</span>
            </button>
          </div>

          {/* Kategori Filtre Hapları */}
          <div className="p-2 border-b border-[#2d3748] flex items-center gap-1 overflow-x-auto text-[11px] scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-[#0082c9] text-white font-medium"
                    : "bg-[#222933] text-slate-400 hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Notlar Listesi */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#2d3748]/50">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Notlar yükleniyor...
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Hiç not bulunamadı. "+ Yeni Not" ile başlayın.
              </div>
            ) : (
              filteredNotes.map((n) => {
                const isSelected = n.id === activeNoteId;
                return (
                  <div
                    key={n.id}
                    onClick={() => selectNote(n)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#222933] border-l-4 border-[#0082c9]"
                        : "hover:bg-[#202731]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-medium text-xs text-slate-200 truncate flex-1">
                        {n.title || "Başlıksız Not"}
                      </span>
                      {n.isFavorite && (
                        <span className="text-amber-400 text-xs">★</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {n.content
                        ? n.content.replace(/[#*`_]/g, "")
                        : "Boş not..."}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                      <span className="px-1.5 py-0.5 rounded bg-black/20 text-slate-400">
                        {n.category}
                      </span>
                      <span>
                        {new Date(n.updatedAt).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ─── SAĞ SÜTUN: Markdown Editör & Önizleme ──────────── */}
        <main className="flex-1 flex flex-col bg-[#181e24] overflow-hidden">
          {activeNote ? (
            <>
              {/* Not Araç Çubuğu */}
              <div className="h-14 border-b border-[#2d3748] px-5 flex items-center justify-between gap-4 bg-[#1a202c]">
                <div className="flex-1 flex items-center gap-3">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Not Başlığı..."
                    className="bg-transparent text-base sm:text-lg font-semibold text-slate-100 placeholder-slate-500 focus:outline-none flex-1 truncate"
                  />
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="bg-[#222933] text-slate-300 text-xs rounded-lg px-2.5 py-1 border border-[#2d3748] focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== "Tümü").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Kaydedildi Durumu */}
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {isSaving
                      ? "Kaydediliyor..."
                      : "Tüm değişiklikler kaydedildi"}
                  </span>

                  {/* Görünüm Modu */}
                  <div className="flex items-center bg-[#222933] rounded-lg p-0.5 border border-[#2d3748] text-xs">
                    <button
                      onClick={() => setViewMode("edit")}
                      className={`px-2 py-1 rounded ${viewMode === "edit" ? "bg-[#0082c9] text-white" : "text-slate-400 hover:text-white"}`}
                      title="Sadece Düzenle"
                    >
                      Yaz
                    </button>
                    <button
                      onClick={() => setViewMode("split")}
                      className={`hidden md:inline px-2 py-1 rounded ${viewMode === "split" ? "bg-[#0082c9] text-white" : "text-slate-400 hover:text-white"}`}
                      title="Bölünmüş Görünüm"
                    >
                      Böl
                    </button>
                    <button
                      onClick={() => setViewMode("preview")}
                      className={`px-2 py-1 rounded ${viewMode === "preview" ? "bg-[#0082c9] text-white" : "text-slate-400 hover:text-white"}`}
                      title="Önizle"
                    >
                      Önizle
                    </button>
                  </div>

                  {/* Favori Butonu */}
                  <button
                    onClick={() => handleToggleFavorite(activeNote.id)}
                    className={`p-1.5 rounded-lg border border-[#2d3748] hover:bg-white/10 ${
                      activeNote.isFavorite
                        ? "text-amber-400"
                        : "text-slate-400"
                    }`}
                    title="Favorilere Ekle"
                  >
                    ★
                  </button>

                  {/* Sil Butonu */}
                  <button
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="p-1.5 rounded-lg border border-[#2d3748] text-rose-400 hover:bg-rose-500/10"
                    title="Notu Sil"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Editör & Önizleme Alanı */}
              <div className="flex-1 flex overflow-hidden">
                {(viewMode === "edit" || viewMode === "split") && (
                  <div
                    className={`flex-1 flex flex-col p-4 overflow-y-auto ${viewMode === "split" ? "border-r border-[#2d3748]" : ""}`}
                  >
                    <textarea
                      value={content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder="Notunuzu Markdown formatında yazmaya başlayın..."
                      className="w-full h-full bg-transparent text-slate-100 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                    />
                  </div>
                )}

                {(viewMode === "preview" || viewMode === "split") && (
                  <div className="flex-1 p-6 overflow-y-auto prose prose-invert max-w-none text-slate-200">
                    <div className="whitespace-pre-wrap font-sans leading-relaxed">
                      {content || (
                        <span className="text-slate-500 italic">
                          Önizlenecek metin yok...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <svg
                className="w-12 h-12 text-slate-600 mb-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
                <path d="M15 3v5h5" />
                <path d="M9 13h6" />
                <path d="M9 17h4" />
              </svg>
              <p className="text-sm font-medium text-slate-400">
                Hiçbir not seçilmedi
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Sol menüden bir not seçin veya yeni bir tane oluşturun.
              </p>
              <button
                onClick={handleCreateNote}
                className="mt-4 px-4 py-2 rounded-lg bg-[#0082c9] text-white text-xs font-semibold hover:bg-[#006aa3] transition-colors"
              >
                + Yeni Not Oluştur
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
