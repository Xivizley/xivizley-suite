"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { NextcloudHeader } from "@xivizley/aurora-ui";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Download,
  Upload,
  X,
  Clock,
  MapPin,
} from "lucide-react";

interface CalEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  color?: string | null;
  reminderMinutes?: number | null;
  notifyEmail?: string | null;
}

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const COLORS = ["#0082c9", "#e9322d", "#2db54b", "#f5a623", "#8b5cf6", "#ec4899"];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface FormState {
  id?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  description: string;
  color: string;
  reminderMinutes: number | null;
  notifyEmail: string;
}

const emptyForm = (date: Date): FormState => ({
  title: "",
  date: dateKey(date),
  startTime: "09:00",
  endTime: "10:00",
  allDay: false,
  location: "",
  description: "",
  color: COLORS[0] ?? "#0082c9",
  reminderMinutes: null,
  notifyEmail: "",
});

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/calendar/events");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) setEvents(json.data);
    } catch (e) {
      console.error("Etkinlikler yüklenemedi:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // Pazartesi başlangıç
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const ev of events) {
      const k = dateKey(new Date(ev.startsAt));
      (map[k] ||= []).push(ev);
    }
    return map;
  }, [events]);

  const openCreate = (day: Date) => {
    setSelectedDay(dateKey(day));
    setForm(emptyForm(day));
  };

  const openEdit = (ev: CalEvent) => {
    const s = new Date(ev.startsAt);
    const e = new Date(ev.endsAt);
    setForm({
      id: ev.id,
      title: ev.title,
      date: dateKey(s),
      startTime: `${pad(s.getHours())}:${pad(s.getMinutes())}`,
      endTime: `${pad(e.getHours())}:${pad(e.getMinutes())}`,
      allDay: ev.allDay,
      location: ev.location || "",
      description: ev.description || "",
      color: ev.color || COLORS[0] || "#0082c9",
      reminderMinutes: ev.reminderMinutes ?? null,
      notifyEmail: ev.notifyEmail || "",
    });
    setInviteMsg(null);
  };

  const saveEvent = async () => {
    if (!form || !form.title.trim()) return;
    setIsSaving(true);
    try {
      const startsAt = form.allDay
        ? `${form.date}T00:00:00.000Z`
        : new Date(`${form.date}T${form.startTime}`).toISOString();
      const endsAt = form.allDay
        ? `${form.date}T23:59:59.000Z`
        : new Date(`${form.date}T${form.endTime || form.startTime}`).toISOString();

      const payload = {
        title: form.title,
        description: form.description,
        location: form.location,
        startsAt,
        endsAt,
        allDay: form.allDay,
        color: form.color,
        reminderMinutes: form.reminderMinutes,
        notifyEmail: form.notifyEmail || null,
      };

      const res = await fetch(
        form.id ? `/api/calendar/events/${form.id}` : "/api/calendar/events",
        {
          method: form.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) {
        setForm(null);
        await fetchEvents();
      }
    } catch (e) {
      console.error("Kaydedilemedi:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        setForm(null);
        await fetchEvents();
      }
    } catch (e) {
      console.error("Silinemedi:", e);
    }
  };

  const sendInvite = async () => {
    if (!form?.id || !form.notifyEmail) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch(`/api/calendar/events/${form.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.notifyEmail }),
      });
      const json = await res.json().catch(() => ({}));
      setInviteMsg(json?.message || (json?.ok ? "Davet gönderildi." : "Gönderilemedi."));
    } catch {
      setInviteMsg("Gönderilemedi.");
    } finally {
      setInviting(false);
    }
  };

  const exportIcs = async () => {
    try {
      const res = await fetch("/api/calendar/export.ics");
      const text = await res.text();
      const blob = new Blob([text], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "xivizley-takvim.ics";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Dışa aktarılamadı:", e);
    }
  };

  const importIcs = async (file: File) => {
    const text = await file.text();
    try {
      const res = await fetch("/api/calendar/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ics: text }),
      });
      if (res.ok) await fetchEvents();
    } catch (e) {
      console.error("İçe aktarılamadı:", e);
    }
  };

  const todayKey = dateKey(new Date());

  return (
    <div className="min-h-screen flex flex-col">
      <NextcloudHeader activeApp="calendar" title="XIVIZLEY Takvim" />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
              aria-label="Önceki ay"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
              aria-label="Sonraki ay"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold ml-1">
              {MONTHS[month]} {year}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importIcs(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
            >
              <Upload className="w-3.5 h-3.5" /> İçe Aktar (.ics)
            </button>
            <button
              onClick={exportIcs}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
            >
              <Download className="w-3.5 h-3.5" /> Dışa Aktar
            </button>
            <button
              onClick={() => openCreate(selectedDay ? new Date(selectedDay) : new Date())}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#0082c9] hover:bg-[#0071b0] text-white transition"
            >
              <Plus className="w-4 h-4" /> Yeni Etkinlik
            </button>
          </div>
        </div>

        {/* Month grid */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) {
                return <div key={i} className="min-h-[92px] border-b border-r border-white/5 bg-black/10" />;
              }
              const key = dateKey(day);
              const dayEvents = eventsByDay[key] || [];
              const isToday = key === todayKey;
              return (
                <button
                  key={i}
                  onClick={() => openCreate(day)}
                  className="min-h-[92px] border-b border-r border-white/5 p-1.5 text-left hover:bg-white/5 transition align-top"
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full ${
                      isToday ? "bg-[#0082c9] text-white" : "text-slate-300"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(ev);
                        }}
                        className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white cursor-pointer"
                        style={{ backgroundColor: ev.color || COLORS[0] }}
                        title={ev.title}
                      >
                        {ev.allDay ? "" : `${new Date(ev.startsAt).getHours()}:${pad(new Date(ev.startsAt).getMinutes())} `}
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-slate-400 pl-1">
                        +{dayEvents.length - 3} daha
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {isLoading && (
          <p className="text-center text-xs text-slate-500 mt-4">Yükleniyor…</p>
        )}
      </main>

      {/* Editor modal */}
      {form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setForm(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1e252c] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">
                {form.id ? "Etkinliği Düzenle" : "Yeni Etkinlik"}
              </h2>
              <button onClick={() => setForm(null)} className="p-1 rounded hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Başlık"
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#0082c9]"
              />

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#0082c9]"
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-300 shrink-0">
                  <input
                    type="checkbox"
                    checked={form.allDay}
                    onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
                  />
                  Tüm gün
                </label>
              </div>

              {!form.allDay && (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase text-slate-400">Başlangıç</label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#0082c9]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase text-slate-400">Bitiş</label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#0082c9]"
                    />
                  </div>
                </div>
              )}

              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Konum (opsiyonel)"
                  className="w-full rounded-lg border border-white/10 bg-black/20 pl-8 pr-3 py-2 text-sm outline-none focus:border-[#0082c9]"
                />
              </div>

              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Açıklama (opsiyonel)"
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#0082c9] resize-none"
              />

              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase text-slate-400 shrink-0">
                  Hatırlatma
                </label>
                <select
                  value={form.reminderMinutes ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reminderMinutes: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#0082c9]"
                >
                  <option value="">Kapalı</option>
                  <option value="10">10 dakika önce</option>
                  <option value="30">30 dakika önce</option>
                  <option value="60">1 saat önce</option>
                  <option value="180">3 saat önce</option>
                  <option value="1440">1 gün önce</option>
                  <option value="2880">2 gün önce</option>
                </select>
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={form.notifyEmail}
                    onChange={(e) => setForm({ ...form, notifyEmail: e.target.value })}
                    placeholder="Hatırlatma/davet e-postası"
                    className="flex-1 rounded-md bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#0082c9] border border-white/10"
                  />
                  {form.id && (
                    <button
                      type="button"
                      onClick={sendInvite}
                      disabled={inviting || !form.notifyEmail}
                      className="shrink-0 px-3 py-2 text-xs font-semibold rounded-md border border-[#0082c9]/50 text-[#66c2e8] hover:bg-[#0082c9]/10 transition disabled:opacity-50"
                    >
                      {inviting ? "…" : "Davet Gönder"}
                    </button>
                  )}
                </div>
                {inviteMsg && (
                  <p className="text-[11px] text-slate-300 mt-1.5">{inviteMsg}</p>
                )}
                <p className="text-[10px] text-slate-500 mt-1">
                  Hatırlatma için e-posta + kaydet. Davet, etkinlik kaydedildikten sonra gönderilir.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] uppercase text-slate-400">Renk</span>
                <div className="flex gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-5 h-5 rounded-full border-2 ${form.color === c ? "border-white" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Renk ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-5">
              {form.id ? (
                <button
                  onClick={() => deleteEvent(form.id!)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-red-300 hover:bg-red-950/40 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Sil
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setForm(null)}
                  className="px-4 py-2 text-xs rounded-lg border border-white/10 hover:bg-white/10 transition"
                >
                  İptal
                </button>
                <button
                  onClick={saveEvent}
                  disabled={isSaving || !form.title.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0082c9] hover:bg-[#0071b0] text-white transition disabled:opacity-50"
                >
                  {isSaving ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
