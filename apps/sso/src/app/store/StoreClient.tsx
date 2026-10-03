"use client";

import React, { useState, useEffect, useMemo } from "react";
import { NextcloudHeader } from "@xivizley/aurora-ui";
import {
  Search,
  Package,
  Server,
  Layers,
  HardDrive,
  Cpu,
  CheckCircle2,
  Play,
  Square,
  Copy,
  Check,
  ExternalLink,
  Download,
  AlertTriangle,
  Terminal,
  FileCode,
  X,
  RefreshCw,
  Trash2,
} from "lucide-react";

export interface StoreApp {
  id: string;
  name: string;
  description: string;
  category: string;
  dockerImage: string;
  defaultTag: string;
  ports: Array<{ internal: number; default: number; label: string; protocol?: string }>;
  environment: Array<{ key: string; defaultValue?: string; description?: string }>;
  volumes: Array<{ hostPath: string; containerPath: string; label: string }>;
  resources: { ramMB: number; cpuCores: number; diskGB: number };
  notes: string[];
  isInstalled?: boolean;
  isRunning?: boolean;
  assignedPort?: number;
  containerId?: string;
}

export interface StoreCategory {
  id: string;
  label: string;
  icon: string;
}

export function StoreClient({ initialAppId }: { initialAppId?: string | undefined }) {
  const [apps, setApps] = useState<StoreApp[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterInstalled, setFilterInstalled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedApp, setSelectedApp] = useState<StoreApp | null>(null);
  const [appDetails, setAppDetails] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"docker" | "cli" | "yaml">("docker");
  const [installingAppId, setInstallingAppId] = useState<string | null>(null);
  const [uninstallingAppId, setUninstallingAppId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Uygulamaları çek
  const fetchApps = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/store/apps", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setApps(json.data || []);
          if (json.categories) setCategories(json.categories);

          // URL'den gelen app varsa aç
          if (initialAppId && !selectedApp) {
            const found = json.data?.find((a: StoreApp) => a.id === initialAppId);
            if (found) {
              openAppModal(found);
            }
          }
        }
      }
    } catch {
      // Hata durumunda boş liste
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // Modal açıldığında detay endpointini çağır
  const openAppModal = async (app: StoreApp) => {
    setSelectedApp(app);
    setAppDetails(null);
    setActiveTab("docker");
    setActionMessage(null);
    try {
      const res = await fetch(`/api/store/apps/${app.id}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setAppDetails(json.data);
        }
      }
    } catch {}
  };

  // 1-Tıkla Docker Çalıştır
  const handleInstallApp = async (appId: string, customPort?: number) => {
    try {
      setInstallingAppId(appId);
      setActionMessage(null);
      const res = await fetch("/api/store/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appId, customPort }),
      });
      const json = await res.json();
      if (json.ok) {
        setActionMessage({
          type: "success",
          text: json.message || "Uygulama başarıyla kuruldu ve başlatıldı!",
        });
        await fetchApps();
        // Detayı da güncelle
        if (selectedApp?.id === appId) {
          openAppModal({ ...selectedApp, isInstalled: true, isRunning: true, assignedPort: json.port });
        }
      } else {
        setActionMessage({
          type: "error",
          text: json.message || "Kurulum başarısız oldu.",
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.message || "Bağlantı hatası oluştu.",
      });
    } finally {
      setInstallingAppId(null);
    }
  };

  // Konteyneri Kaldır
  const handleUninstallApp = async (appId: string) => {
    if (!confirm(`${appId} uygulamasını durdurup kaldırmak istediğinize emin misiniz?`)) return;
    try {
      setUninstallingAppId(appId);
      setActionMessage(null);
      const res = await fetch("/api/store/uninstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appId }),
      });
      const json = await res.json();
      if (json.ok) {
        setActionMessage({
          type: "success",
          text: json.message || "Uygulama başarıyla kaldırıldı.",
        });
        await fetchApps();
        if (selectedApp?.id === appId) {
          openAppModal({ ...selectedApp, isInstalled: false, isRunning: false });
        }
      } else {
        setActionMessage({
          type: "error",
          text: json.message || "Kaldırma işlemi başarısız.",
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.message || "Bağlantı hatası oluştu.",
      });
    } finally {
      setUninstallingAppId(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filtrelenmiş uygulamalar
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      if (activeCategory !== "all" && app.category !== activeCategory) return false;
      if (filterInstalled && !app.isInstalled) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          app.name.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q) ||
          app.id.toLowerCase().includes(q) ||
          app.dockerImage.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [apps, activeCategory, filterInstalled, searchQuery]);

  return (
    <div className="min-h-screen bg-[#181e24] text-slate-100 flex flex-col font-sans">
      {/* ─── Nextcloud Signature Header ───────────────────────── */}
      <NextcloudHeader activeApp="store" title="Uygulama Mağazası" />

      {/* ─── Store Main Layout ────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Hero Banner */}
        <div className="rounded-xl border border-[#2d3748] bg-[#222933] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0082c9]" />
              <span className="text-xs font-semibold text-[#38bdf8] uppercase tracking-wider">
                Docker Native Homelab App Store
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Uygulama Mağazası & Pazar Yeri
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              115+ küratörlü açık kaynaklı bulut, medya, güvenlik ve veritabanı uygulaması. 1-tıkla Docker kurulumu,
              kopyalanabilir Compose YAML ve CLI komut desteği.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="px-3 py-2 rounded-lg bg-[#181e24] border border-[#2d3748] flex items-center gap-2 text-slate-300">
              <Package className="w-4 h-4 text-[#0082c9]" />
              <span>{apps.length} Uygulama</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[#181e24] border border-[#2d3748] flex items-center gap-2 text-slate-300">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>/opt/xivizley-apps/</span>
            </div>
          </div>
        </div>

        {/* ─── Search & Category Controls ──────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Uygulama adı, Docker imajı veya açıklama ara..."
                className="w-full h-10 pl-9 pr-9 rounded-lg bg-[#222933] border border-[#2d3748] focus:border-[#0082c9] focus:outline-none text-xs text-white placeholder-slate-400 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Toggle Filters */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterInstalled((prev) => !prev)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                  filterInstalled
                    ? "bg-[#0082c9] text-white border-[#006aa3]"
                    : "bg-[#222933] text-slate-300 border-[#2d3748] hover:bg-[#2b3442]"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Yüklü Olanlar ({apps.filter((a) => a.isInstalled).length})</span>
              </button>
              <button
                type="button"
                onClick={fetchApps}
                className="p-2.5 rounded-lg bg-[#222933] text-slate-400 hover:text-white border border-[#2d3748] hover:bg-[#2b3442] transition-colors"
                title="Listeyi Yenile"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                activeCategory === "all"
                  ? "bg-[#0082c9] text-white border-[#006aa3]"
                  : "bg-[#222933] text-slate-400 border-[#2d3748] hover:bg-[#2b3442] hover:text-slate-200"
              }`}
            >
              Tümü ({apps.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                  activeCategory === cat.id
                    ? "bg-[#0082c9] text-white border-[#006aa3]"
                    : "bg-[#222933] text-slate-400 border-[#2d3748] hover:bg-[#2b3442] hover:text-slate-200"
                }`}
              >
                {cat.label} ({apps.filter((a) => a.category === cat.id).length})
              </button>
            ))}
          </div>
        </div>

        {/* ─── App Cards Grid ─────────────────────────────────── */}
        {isLoading && apps.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#0082c9] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">115+ uygulama kataloğu ve Docker durumu taranıyor...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="p-16 text-center rounded-xl border border-[#2d3748] bg-[#222933] space-y-2">
            <Package className="w-10 h-10 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Eşleşen uygulama bulunamadı</p>
            <p className="text-xs text-slate-400">Arama kriterlerinizi veya kategori filtrenizi değiştirin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApps.map((app) => {
              const primaryPort = app.ports[0];
              return (
                <div
                  key={app.id}
                  className="rounded-xl border border-[#2d3748] bg-[#222933] p-5 flex flex-col justify-between space-y-4 hover:border-[#0082c9] transition-all hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#181e24] border border-[#2d3748] flex items-center justify-center text-[#0082c9] shrink-0 font-bold text-sm">
                        {app.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {app.isInstalled ? (
                          app.isRunning ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Çalışıyor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Durduruldu
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#181e24] text-slate-400 border border-[#2d3748]">
                            Kullanılabilir
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#181e24] text-slate-400 border border-[#2d3748] font-mono">
                          {app.category}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-100 text-sm flex items-center justify-between">
                        <span>{app.name}</span>
                        {app.assignedPort && (
                          <span className="text-[11px] text-sky-400 font-mono">:{app.assignedPort}</span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {app.description}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1 truncate max-w-[160px]" title={app.dockerImage}>
                        <Package className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{app.dockerImage}</span>
                      </span>
                      {app.resources && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Cpu className="w-3 h-3 text-slate-500" />
                          <span>{app.resources.ramMB} MB</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#2d3748] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openAppModal(app)}
                      className="px-3 py-1.5 rounded-lg bg-[#2b3442] hover:bg-[#343e4f] text-slate-200 text-xs font-medium border border-[#3b4758] transition-colors"
                    >
                      Detay / YAML / CLI
                    </button>

                    {app.isInstalled ? (
                      <button
                        type="button"
                        onClick={() => openAppModal(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Yüklendi</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={installingAppId === app.id}
                        onClick={() => handleInstallApp(app.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                      >
                        {installingAppId === app.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                        <span>{installingAppId === app.id ? "Başlatılıyor..." : "Hızlı Kur"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── APP DETAIL & HYBRID INSTALL MODAL ───────────────── */}
        {selectedApp && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setSelectedApp(null)}
          >
            <div
              className="w-full max-w-3xl bg-[#1e2530] border border-[#2d3748] rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 max-h-[90vh] animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-[#2d3748] bg-[#181e24] flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#222933] border border-[#2d3748] flex items-center justify-center text-[#0082c9] font-bold text-lg">
                    {selectedApp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{selectedApp.name}</h2>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#2b3442] text-slate-300 font-mono">
                        {selectedApp.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedApp.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2b3442] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Alert Banner */}
              {actionMessage && (
                <div
                  className={`p-3 text-xs px-5 flex items-center justify-between ${
                    actionMessage.type === "success"
                      ? "bg-emerald-950/60 text-emerald-300 border-b border-emerald-800/40"
                      : "bg-rose-950/60 text-rose-300 border-b border-rose-800/40"
                  }`}
                >
                  <span>{actionMessage.text}</span>
                  <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Modal Content Body */}
              <div className="p-5 overflow-y-auto space-y-6 flex-1">
                {/* Meta Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-[#181e24] border border-[#2d3748]">
                    <span className="text-slate-400 block text-[10px]">DOCKER İMAJI</span>
                    <span className="font-semibold text-slate-200 truncate block mt-0.5">
                      {selectedApp.dockerImage}:{selectedApp.defaultTag || "latest"}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#181e24] border border-[#2d3748]">
                    <span className="text-slate-400 block text-[10px]">VARSAYILAN PORT</span>
                    <span className="font-semibold text-sky-400 block mt-0.5">
                      {selectedApp.ports[0]?.default ? `:${selectedApp.ports[0].default}` : "Portsuz"}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#181e24] border border-[#2d3748]">
                    <span className="text-slate-400 block text-[10px]">MİNİMUM BELLEK</span>
                    <span className="font-semibold text-emerald-400 block mt-0.5">
                      {selectedApp.resources?.ramMB || 256} MB RAM
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#181e24] border border-[#2d3748]">
                    <span className="text-slate-400 block text-[10px]">DURUM</span>
                    <span className="font-semibold text-slate-200 block mt-0.5">
                      {selectedApp.isInstalled ? (selectedApp.isRunning ? "🟢 Çalışıyor" : "🟡 Durduruldu") : "⚪ Kurulu Değil"}
                    </span>
                  </div>
                </div>

                {/* Storage Standard Guarantee */}
                <div className="p-3.5 rounded-lg bg-[#151c24] border border-[#2d3748] flex items-start gap-3 text-xs">
                  <HardDrive className="w-4 h-4 text-[#0082c9] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-200">İzole Uygulama Depolama Standardı:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5 font-mono">
                      {selectedApp.volumes[0]?.hostPath || `/opt/xivizley-apps/${selectedApp.id}/data`}
                    </p>
                    <p className="text-slate-500 text-[10px] mt-0.5">
                      Tüm veriler ve konfigürasyonlar kesin olarak <code>/opt/xivizley-apps/{selectedApp.id}/</code> dizininde saklanır.
                    </p>
                  </div>
                </div>

                {/* Port Conflict Warnings (if applicable) */}
                {appDetails?.isPortTaken && (
                  <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 text-xs text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Port Çakışması Önlendi:</span>
                      <p className="text-[11px] mt-0.5">
                        Varsayılan port (:{selectedApp.ports[0]?.default}) sistemde kullanımda.
                        Otomatik güvenli boş port <strong>:{appDetails?.suggestedPort}</strong> olarak tayin edildi.
                      </p>
                    </div>
                  </div>
                )}

                {/* Hybrid Options Switcher Tabs */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1 border-b border-[#2d3748]">
                    <button
                      type="button"
                      onClick={() => setActiveTab("docker")}
                      className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                        activeTab === "docker"
                          ? "border-[#0082c9] text-white"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>1-Tıkla Docker Motoru</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("cli")}
                      className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                        activeTab === "cli"
                          ? "border-[#0082c9] text-white"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>CLI Komutu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("yaml")}
                      className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                        activeTab === "yaml"
                          ? "border-[#0082c9] text-white"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Compose YAML</span>
                    </button>
                  </div>

                  {/* Tab 1: 1-Click Docker */}
                  {activeTab === "docker" && (
                    <div className="space-y-4 pt-2">
                      <p className="text-xs text-slate-400">
                        Sunucu üzerindeki yerel Docker soketi aracılığıyla <code>xivizley-app-{selectedApp.id}</code> konteynerini
                        arka planda başlatın.
                      </p>

                      <div className="flex flex-wrap items-center gap-3">
                        {selectedApp.isInstalled ? (
                          <>
                            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Konteyner Aktif ({selectedApp.assignedPort ? `:${selectedApp.assignedPort}` : "Yayında"})</span>
                            </span>
                            <button
                              type="button"
                              disabled={uninstallingAppId === selectedApp.id}
                              onClick={() => handleUninstallApp(selectedApp.id)}
                              className="px-3.5 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-medium border border-rose-500/40 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{uninstallingAppId === selectedApp.id ? "Kaldırılıyor..." : "Konteyneri Kaldır"}</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={installingAppId === selectedApp.id}
                            onClick={() => handleInstallApp(selectedApp.id, appDetails?.suggestedPort)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
                          >
                            {installingAppId === selectedApp.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4 fill-current" />
                            )}
                            <span>
                              {installingAppId === selectedApp.id
                                ? "Konteyner Hazırlanıyor..."
                                : "1-Tıkla Şimdi Kur ve Başlat"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: CLI Command */}
                  {activeTab === "cli" && (
                    <div className="space-y-3 pt-2">
                      <p className="text-xs text-slate-400">
                        SSH terminalinizde veya yerel makinenizde XIVIZLEY CLI ile tek komutla kurun:
                      </p>
                      <div className="relative rounded-lg bg-[#141a22] border border-[#2d3748] p-3 text-xs font-mono text-emerald-400 flex items-center justify-between">
                        <code>xivizley install {selectedApp.id}</code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`xivizley install ${selectedApp.id}`, "cli")}
                          className="p-1.5 rounded bg-[#222933] hover:bg-[#2b3442] text-slate-300 transition-colors flex items-center gap-1 text-[11px]"
                        >
                          {copiedKey === "cli" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === "cli" ? "Kopyalandı" : "Kopyala"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Docker Compose YAML */}
                  {activeTab === "yaml" && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Standardize Docker Compose Manifesti:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const yamlText = appDetails?.composeYaml || "";
                              copyToClipboard(yamlText, "yaml");
                            }}
                            className="p-1.5 px-2.5 rounded bg-[#222933] hover:bg-[#2b3442] text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-medium border border-[#2d3748]"
                          >
                            {copiedKey === "yaml" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === "yaml" ? "Kopyalandı" : "YAML Kopyala"}</span>
                          </button>
                          <a
                            href={`/api/store/yaml/${selectedApp.id}`}
                            download={`${selectedApp.id}-docker-compose.yml`}
                            className="p-1.5 px-2.5 rounded bg-[#222933] hover:bg-[#2b3442] text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-medium border border-[#2d3748]"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>İndir</span>
                          </a>
                        </div>
                      </div>

                      <pre className="p-4 rounded-lg bg-[#141a22] border border-[#2d3748] text-xs font-mono text-slate-300 overflow-x-auto max-h-64 scrollbar-thin">
                        {appDetails?.composeYaml || "YAML yükleniyor..."}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-[#141a22] border-t border-[#2d3748] flex items-center justify-between text-xs text-slate-400">
                <span>XIVIZLEY Enterprise Homelab Engine</span>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 rounded-lg bg-[#222933] hover:bg-[#2b3442] text-slate-200 font-medium"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
