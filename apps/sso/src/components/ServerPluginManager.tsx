"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Search,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Filter,
  Sparkles,
  Layers,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import { useGameStore } from "@/store/cockpit-store";
import { GAME_CATALOG } from "@/data/game-catalog";
import { useToast } from "@xivizley/aurora-ui";

interface PluginItem {
  id: string;
  gameId: string;
  name: string;
  category: "Core" | "Economy" | "Admin" | "Utility" | "Framework" | "Voice";
  version: string;
  author: string;
  description: string;
  fileName: string;
  icon: string;
  isInstalled: boolean;
}

export function ServerPluginManager() {
  const toast = useToast();
  const { activeGameId } = useGameStore();
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [restartReminder, setRestartReminder] = useState(false);

  const gameInfo = GAME_CATALOG[activeGameId] || { name: activeGameId };

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/server/plugins?gameId=${activeGameId}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.plugins)) {
        setPlugins(data.plugins);
      }
    } catch (err) {
      console.error("Eklentiler yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
    setRestartReminder(false);
  }, [activeGameId]);

  const handleInstall = async (plugin: PluginItem) => {
    setActionLoadingId(plugin.id);
    try {
      const res = await fetch("/api/server/plugins/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: activeGameId,
          pluginId: plugin.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || `${plugin.name} başarıyla kuruldu.`);
        setPlugins((prev) =>
          prev.map((p) => (p.id === plugin.id ? { ...p, isInstalled: true } : p))
        );
        setRestartReminder(true);
      } else {
        toast.error(data.message || "Kurulum başarısız.");
      }
    } catch (err: any) {
      toast.error(err.message || "Bağlantı hatası.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUninstall = async (plugin: PluginItem) => {
    if (!confirm(`${plugin.name} eklentisini sunucudan kaldırmak istediğinize emin misiniz?`)) return;

    setActionLoadingId(plugin.id);
    try {
      const res = await fetch("/api/server/plugins/uninstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: activeGameId,
          pluginId: plugin.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || `${plugin.name} kaldırıldı.`);
        setPlugins((prev) =>
          prev.map((p) => (p.id === plugin.id ? { ...p, isInstalled: false } : p))
        );
        setRestartReminder(true);
      } else {
        toast.error(data.message || "Kaldırma işlemi başarısız.");
      }
    } catch (err: any) {
      toast.error(err.message || "Bağlantı hatası.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    plugins.forEach((p) => set.add(p.category));
    return ["all", "installed", ...Array.from(set)];
  }, [plugins]);

  const filteredPlugins = useMemo(() => {
    return plugins.filter((p) => {
      if (selectedCategory === "installed" && !p.isInstalled) return false;
      if (selectedCategory !== "all" && selectedCategory !== "installed" && p.category !== selectedCategory) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [plugins, selectedCategory, searchQuery]);

  const installedCount = plugins.filter((p) => p.isInstalled).length;

  return (
    <div className="space-y-6">
      {/* ─── Hero Bar ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#1e2a3c] bg-[#111824] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧩</span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {gameInfo.name} — Eklentiler & Mod Pazar Yeri
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-semibold">
              {installedCount} Kurulu / {plugins.length} Eklenti
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {activeGameId === "fivem"
              ? "FiveM sunucunuz için optimize edilmiş popüler QBCore, ESX, ox_lib kütüphaneleri ve uzamsal ses modları."
              : "Minecraft Paper/Purpur/Spigot sunucunuz için test edilmiş en popüler resmi eklentileri tek tıkla kurun."}
          </p>
        </div>

        <button
          onClick={fetchPlugins}
          disabled={loading}
          className="p-2.5 rounded-xl bg-[#182333] hover:bg-[#1e2a3c] text-slate-300 hover:text-white border border-[#223044] transition-colors self-start sm:self-auto cursor-pointer"
          title="Listeyi Yenile"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ─── Restart Reminder Banner ──────────────────────────── */}
      {restartReminder && (
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Eklenti durumu değişti. Değişikliklerin sunucuda aktif olması için Canlı Konsol sekmesinden sunucunuzu yeniden başlatınız.
            </span>
          </div>
          <button
            onClick={() => setRestartReminder(false)}
            className="text-xs px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 font-bold text-amber-200 transition-colors"
          >
            Tamam
          </button>
        </div>
      )}

      {/* ─── Search & Category Filters ────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Eklenti adı, açıklama veya yazara göre ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#111824] border border-[#1e2a3c] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#1AD76F]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#1AD76F] text-black shadow-md font-bold"
                  : "bg-[#111824] text-slate-400 hover:text-white border border-[#1e2a3c]"
              }`}
            >
              {cat === "all" ? "Tümü" : cat === "installed" ? `Kurulu (${installedCount})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Plugin Grid ──────────────────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 rounded-2xl bg-[#111824] border border-[#1e2a3c]">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#1AD76F] mb-2" />
          <p className="text-xs">Eklenti kütüphanesi taranıyor...</p>
        </div>
      ) : filteredPlugins.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-[#111824] border border-[#1e2a3c] space-y-3">
          <Package className="h-10 w-10 text-slate-600 mx-auto" />
          <h4 className="text-base font-semibold text-slate-300">Eklenti bulunamadı</h4>
          <p className="text-xs text-slate-400">
            Arama kriterinize uygun bir eklenti veya mod eşleşmedi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlugins.map((plugin) => {
            const isLoadingThis = actionLoadingId === plugin.id;
            return (
              <div
                key={plugin.id}
                className={`rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 ${
                  plugin.isInstalled
                    ? "bg-[#131c2a] border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                    : "bg-[#111824] border-[#1e2a3c] hover:border-[#2b3a50]"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#182333] border border-[#223044] flex items-center justify-center text-2xl shrink-0">
                        {plugin.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{plugin.name}</span>
                          {plugin.isInstalled && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          )}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono">v{plugin.version}</span>
                          <span>•</span>
                          <span>{plugin.author}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        plugin.isInstalled
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-white/5 text-slate-400 border border-white/10"
                      }`}
                    >
                      {plugin.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {plugin.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1e2a3c] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-[150px]">
                    {plugin.fileName}
                  </span>

                  {plugin.isInstalled ? (
                    <button
                      onClick={() => handleUninstall(plugin)}
                      disabled={isLoadingThis}
                      className="h-8 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 border border-rose-500/30 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isLoadingThis ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span>Kaldır</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInstall(plugin)}
                      disabled={isLoadingThis}
                      className="h-8 px-3 rounded-xl bg-[#1AD76F] hover:bg-[#15b75e] text-black text-xs font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(26,215,111,0.2)] transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isLoadingThis ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      <span>1-Tıkla Kur</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
