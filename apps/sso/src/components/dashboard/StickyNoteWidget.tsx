"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FileText,
  Check,
  RefreshCw,
  ArrowRight,
  Pin,
  ExternalLink,
} from "lucide-react";

export function StickyNoteWidget() {
  const [content, setContent] = useState<string>("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // İlk yüklemede mevcut notu çek veya oluştur
  useEffect(() => {
    let isMounted = true;

    async function loadStickyNote() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/notes", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
            // Varsa yapışkan veya ilk notu al
            const sticky = json.data.find((n: any) => n.title === "Hızlı Not" || n.isPinned) || json.data[0];
            if (isMounted) {
              setNoteId(sticky.id);
              setContent(sticky.content || "");
              setLastSavedTime("Kaydedildi");
            }
          } else {
            // Hiç not yoksa başlangıç notunu oluştur
            const createRes = await fetch("/api/notes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                title: "Hızlı Not",
                content: "Hub paneli hızlı notunuz burada saklanır...",
                category: "Genel",
              }),
            });
            if (createRes.ok) {
              const createdJson = await createRes.json();
              if (isMounted && createdJson.data) {
                setNoteId(createdJson.data.id);
                setContent(createdJson.data.content);
                setLastSavedTime("Kaydedildi");
              }
            }
          }
        }
      } catch {
        // Hata toleransı
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStickyNote();
    return () => {
      isMounted = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Metin değiştikçe 600ms debounce ile otomatik kaydet
  const handleContentChange = (newVal: string) => {
    setContent(newVal);
    setIsSaving(true);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (noteId) {
          await fetch(`/api/notes/${noteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              title: "Hızlı Not",
              content: newVal,
              isPinned: true,
            }),
          });
        } else {
          const createRes = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              title: "Hızlı Not",
              content: newVal,
              category: "Genel",
            }),
          });
          const createdJson = await createRes.json();
          if (createdJson.data?.id) setNoteId(createdJson.data.id);
        }
        setLastSavedTime("Kaydedildi");
      } catch {
        setLastSavedTime("Kaydetme hatası");
      } finally {
        setIsSaving(false);
      }
    }, 600);
  };

  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#222933] p-5 flex flex-col justify-between space-y-4 shadow-sm">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                <span>Hızlı Not</span>
                <Pin className="w-3 h-3 text-amber-400 rotate-45" />
              </h3>
              <p className="text-[10px] text-slate-400">Otomatik kaydedilen yapışkan not</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono flex items-center gap-1 text-slate-400">
              {isSaving ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-[#0082c9]" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>{lastSavedTime || "Kaydedildi"}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Textarea Scratchpad */}
        <div className="relative">
          {isLoading ? (
            <div className="h-36 rounded-lg bg-[#181e24] border border-[#2d3748] flex items-center justify-center text-xs text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0082c9] mr-2" />
              <span>Not yükleniyor...</span>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Aklınıza gelen fikirleri, görevleri veya hızlı notları buraya yazın... Otomatik olarak Notlar uygulamasına senkronize edilir."
              className="w-full h-36 p-3 rounded-lg bg-[#181e24] border border-[#2d3748] text-xs text-slate-200 placeholder-slate-500 focus:border-[#0082c9] focus:outline-none resize-none leading-relaxed transition-colors font-sans"
            />
          )}
        </div>
      </div>

      {/* Footer Link */}
      <div className="pt-2 border-t border-[#2d3748]/60 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500 font-mono">
          {content.length} karakter
        </span>
        <Link
          href="/notes"
          className="inline-flex items-center gap-1 text-[#0082c9] hover:text-[#38bdf8] font-medium transition-colors"
        >
          <span>Notlar Uygulaması</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
