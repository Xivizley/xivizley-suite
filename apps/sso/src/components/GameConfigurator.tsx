"use client";

import { useState, useMemo, useEffect } from "react";
import { useGameStore } from "@/store/cockpit-store";
import { GAME_CATALOG } from "@/data/game-catalog";

// ─── Minecraft Renk Kodları & Parselleyici ────────────────────────
const MC_COLOR_MAP: Record<string, string> = {
  "0": "#000000", // Siyah
  "1": "#0000AA", // Koyu Mavi
  "2": "#00AA00", // Koyu Yeşil
  "3": "#00AAAA", // Koyu Camgöbeği
  "4": "#AA0000", // Koyu Kırmızı
  "5": "#AA00AA", // Mor
  "6": "#FFAA00", // Altın
  "7": "#AAAAAA", // Açık Gri
  "8": "#555555", // Koyu Gri
  "9": "#5555FF", // Mavi
  a: "#55FF55", // Açık Yeşil
  b: "#55FFFF", // Camgöbeği
  c: "#FF5555", // Açık Kırmızı
  d: "#FF55FF", // Pembe
  e: "#FFFF55", // Sarı
  f: "#FFFFFF", // Beyaz
};

const COLOR_CHIPS = [
  { code: "&a", name: "Açık Yeşil", hex: "#55FF55" },
  { code: "&b", name: "Camgöbeği", hex: "#55FFFF" },
  { code: "&c", name: "Kırmızı", hex: "#FF5555" },
  { code: "&e", name: "Sarı", hex: "#FFFF55" },
  { code: "&6", name: "Altın", hex: "#FFAA00" },
  { code: "&d", name: "Pembe", hex: "#FF55FF" },
  { code: "&f", name: "Beyaz", hex: "#FFFFFF" },
  { code: "&7", name: "Açık Gri", hex: "#AAAAAA" },
  { code: "&8", name: "Koyu Gri", hex: "#555555" },
  { code: "&l", name: "Kalın (Bold)", hex: "#38bdf8" },
  { code: "&r", name: "Sıfırla (Reset)", hex: "#94a3b8" },
];

function renderMinecraftText(text: string) {
  if (!text)
    return <span className="text-white/40 italic">MOTD tanımlanmadı</span>;

  const clean = text.replace(/\\n/g, "\n");
  const lines = clean.split("\n");

  return (
    <div className="flex flex-col gap-0.5 font-mono text-xs select-none">
      {lines.map((line, lineIdx) => {
        const parts: Array<{
          text: string;
          color: string;
          bold: boolean;
          italic: boolean;
          underline: boolean;
        }> = [];

        let currentColor = "#FFFFFF";
        let currentBold = false;
        let currentItalic = false;
        let currentUnderline = false;

        let cursor = 0;
        let buffer = "";

        const flush = () => {
          if (buffer) {
            parts.push({
              text: buffer,
              color: currentColor,
              bold: currentBold,
              italic: currentItalic,
              underline: currentUnderline,
            });
            buffer = "";
          }
        };

        while (cursor < line.length) {
          const char = line[cursor];
          if ((char === "&" || char === "§") && cursor + 1 < line.length) {
            const code = line[cursor + 1]?.toLowerCase();
            if (code && MC_COLOR_MAP[code]) {
              flush();
              currentColor = MC_COLOR_MAP[code];
              currentBold = false;
              currentItalic = false;
              currentUnderline = false;
              cursor += 2;
              continue;
            } else if (code === "l") {
              flush();
              currentBold = true;
              cursor += 2;
              continue;
            } else if (code === "o") {
              flush();
              currentItalic = true;
              cursor += 2;
              continue;
            } else if (code === "n") {
              flush();
              currentUnderline = true;
              cursor += 2;
              continue;
            } else if (code === "r") {
              flush();
              currentColor = "#FFFFFF";
              currentBold = false;
              currentItalic = false;
              currentUnderline = false;
              cursor += 2;
              continue;
            }
          }
          buffer += char;
          cursor++;
        }
        flush();

        return (
          <div key={lineIdx} className="leading-tight min-h-[1.25em]">
            {parts.map((p, pIdx) => (
              <span
                key={pIdx}
                style={{
                  color: p.color,
                  fontWeight: p.bold ? "bold" : "normal",
                  fontStyle: p.italic ? "italic" : "normal",
                  textDecoration: p.underline ? "underline" : "none",
                  textShadow: "1px 1px 1px rgba(0,0,0,0.9)",
                }}
              >
                {p.text}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function GameConfigurator() {
  const {
    activeGameId,
    configPerGame,
    updateConfig,
    toggleModPack,
    togglePlugin,
    isAdmin,
  } = useGameStore();

  const [pluginCategory, setPluginCategory] = useState<string>("ALL");
  const [pluginSearch, setPluginSearch] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Hızlı Yönetici Komut State'leri
  const [quickCmdRunning, setQuickCmdRunning] = useState<string | null>(null);
  const [quickCmdFeedback, setQuickCmdFeedback] = useState<string | null>(null);
  const [opPlayerName, setOpPlayerName] = useState("");
  const [kickPlayerName, setKickPlayerName] = useState("");

  const game = GAME_CATALOG[activeGameId];
  const config = configPerGame[activeGameId] || game.defaultConfig;
  const currentEngine =
    game.engines.find((e) => e.id === config.engineId) || game.engines[0];

  // Oyun veya Motor değiştiğinde filtreleri sıfırla
  useEffect(() => {
    setPluginCategory("ALL");
    setPluginSearch("");
  }, [activeGameId, config.engineId]);

  // Motora göre uyumlu mod paketleri
  const availableModPacks = useMemo(() => {
    return game.modPacks.filter((pack) => {
      if (!pack.engines || pack.engines.length === 0) return true;
      return pack.engines.includes(config.engineId);
    });
  }, [game.modPacks, config.engineId]);

  // Motora göre uyumlu eklentiler / modlar
  const availablePlugins = useMemo(() => {
    return game.plugins.filter((plugin) => {
      if (!plugin.engines || plugin.engines.length === 0) return true;
      return plugin.engines.includes(config.engineId);
    });
  }, [game.plugins, config.engineId]);

  // Eklenti kategorileri (sadece geçerli motorda olanlar)
  const categories = useMemo(() => {
    const set = new Set<string>();
    availablePlugins.forEach((p) => set.add(p.category));
    return ["ALL", ...Array.from(set)];
  }, [availablePlugins]);

  // Filtrelenmiş eklentiler
  const filteredPlugins = useMemo(() => {
    return availablePlugins.filter((p) => {
      const matchCat =
        pluginCategory === "ALL" || p.category === pluginCategory;
      const matchSearch =
        !pluginSearch.trim() ||
        p.name.toLowerCase().includes(pluginSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(pluginSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(pluginSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [availablePlugins, pluginCategory, pluginSearch]);

  // Modpaketi seçildiğinde bağlı eklentileri otomatik aktif et
  const handleToggleModPack = (packId: string) => {
    const pack = game.modPacks.find((p) => p.id === packId);
    const isSelected = config.selectedPackIds.includes(packId);
    toggleModPack(activeGameId, packId);

    if (
      !isSelected &&
      pack?.includedPluginIds &&
      pack.includedPluginIds.length > 0
    ) {
      const currentPlugins = new Set(config.enabledPluginIds || []);
      pack.includedPluginIds.forEach((id) => currentPlugins.add(id));
      updateConfig(activeGameId, {
        enabledPluginIds: Array.from(currentPlugins),
      });
    }
  };

  // Hızlı Yönetici Komut Gönderici
  const sendQuickCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    setQuickCmdRunning(cmd);
    setQuickCmdFeedback(null);
    try {
      const res = await fetch("/api/server/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: activeGameId, command: cmd }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setQuickCmdFeedback(`✅ Komut yürütüldü: ${cmd}`);
      } else {
        setQuickCmdFeedback(
          `❌ Hata: ${data.message || "Komut çalıştırılamadı"}`,
        );
      }
    } catch (err: any) {
      setQuickCmdFeedback(`❌ Bağlantı hatası: ${err.message}`);
    } finally {
      setQuickCmdRunning(null);
      setTimeout(() => setQuickCmdFeedback(null), 4000);
    }
  };

  const handleApplyConfig = async () => {
    setIsApplying(true);
    setApplyResult(null);

    try {
      const res = await fetch("/api/server/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: activeGameId,
          config,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setApplyResult({
          ok: true,
          message: data.noop
            ? "Yapılandırma güncel (Değişiklik yapılmadı — İdempotent)"
            : data.message || "Yapılandırma başarıyla kaydedildi.",
        });
      } else {
        setApplyResult({
          ok: false,
          message: data.message || "Yapılandırma kaydedilemedi.",
        });
      }
    } catch (err: any) {
      setApplyResult({
        ok: false,
        message: err.message || "Sunucuyla bağlantı kurulamadı.",
      });
    } finally {
      setIsApplying(false);
      setTimeout(() => setApplyResult(null), 5000);
    }
  };

  const insertColorCode = (code: string) => {
    const currentMotd = config.motd || "";
    updateConfig(activeGameId, {
      motd: currentMotd + code,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-[#222933] border border-[#2d3748] rounded-xl shadow-sm">
      {/* Oyun Başlık & Üst Bilgi */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#2d3748]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{game.icon}</span>
            <h2 className="text-xl font-bold text-white">
              {game.name} Yapılandırması
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#0082c9]/15 text-[#38bdf8] border border-[#0082c9]/30">
              {game.badge}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{game.tagline}</p>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-[11px] text-slate-400 block">İzole Hacim:</span>
          <span className="font-mono text-xs text-slate-200 bg-[#181e24] px-2 py-0.5 rounded border border-[#2d3748]">
            {game.volumeName}
          </span>
        </div>
      </div>

      {/* 1. MOTOR & SÜRÜM SEÇİM MENÜSÜ */}
      <div className="flex flex-col gap-4 p-4 rounded-xl bg-[#181e24] border border-[#2d3748]">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <span>⚙️</span> 1. Oyun Motoru ve Sürüm Seçimi (
            {game.engines.length} Motor Mevcut)
          </label>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            Seçili: {currentEngine?.name.split(" ")[0]} v{config.version}
          </span>
        </div>

        {/* Motor Seçici Kartları */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium text-slate-400">
            Sunucu Çekirdeği / Motoru:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {game.engines.map((eng) => {
              const isSelected = config.engineId === eng.id;
              return (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => {
                    updateConfig(activeGameId, {
                      engineId: eng.id,
                      version:
                        eng.defaultVersion || eng.versions[0] || "latest",
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#0082c9]/15 border-[#0082c9] text-white shadow-sm ring-1 ring-[#0082c9]"
                      : "bg-[#222933] border-[#2d3748] text-slate-300 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs text-white">
                      {eng.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      +{eng.overheadMb} MB
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 font-mono">
                    {eng.versions.length} resmi sürüm
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sürüm Seçim Menüsü */}
        <div className="flex flex-col gap-2.5 pt-3 border-t border-[#2d3748]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <span>🎯</span> {currentEngine?.name.split(" ")[0]} Sürümleri (
              {currentEngine?.versions.length || 0} Adet):
            </span>
            <span className="text-[10px] text-[#0082c9] font-mono">
              1-Tıkla Sürüm Değiştir
            </span>
          </div>

          {/* Sürüm Hapları (Scrollable & Responsive) */}
          <div className="flex items-center gap-1.5 flex-wrap max-h-36 overflow-y-auto pr-1">
            {(currentEngine?.versions || ["latest"]).map((v) => {
              const isSelected = config.version === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateConfig(activeGameId, { version: v })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#0082c9] text-white font-semibold shadow-sm"
                      : "bg-[#222933] text-slate-300 hover:text-white hover:bg-[#2b3442] border border-[#2d3748]"
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>

          {/* Manuel / Özel Sürüm Giriş Alanı */}
          <div className="flex items-center gap-2 mt-1">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-[#0082c9]">
                Özel Sürüm:
              </span>
              <input
                type="text"
                placeholder="Örn: latest veya özel sürüm numarası..."
                value={config.version}
                onChange={(e) =>
                  updateConfig(activeGameId, { version: e.target.value })
                }
                className="w-full bg-[#222933] border border-[#2d3748] rounded-lg pl-24 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#0082c9] transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUNUCU GÖRÜNÜMÜ & OYUN AYARLARI */}
      <div className="flex flex-col gap-4 p-4 rounded-xl bg-[#181e24] border border-[#2d3748]">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <span>🏷️</span> 2. Sunucu Görünümü, Kimliği & Ayarları
          </label>
          <span className="text-[10px] font-mono text-[#0082c9] bg-[#0082c9]/10 px-2 py-0.5 rounded-full border border-[#0082c9]/20">
            {game.name} Dedicated
          </span>
        </div>

        {/* Canlı Sunucu Listesi / Tarayıcı Kartı Önizlemesi */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <span>🎮</span> Sunucu Listesi Canlı Önizleme Kartı:
          </span>

          {activeGameId === "minecraft" ? (
            <div className="p-3 rounded-xl bg-[#18181b] border-2 border-[#27272a] shadow-2xl flex items-center gap-3.5 select-none">
              <div className="w-14 h-14 rounded bg-[#4b331f] border-2 border-[#302114] relative overflow-hidden shrink-0 shadow-inner flex flex-col justify-between">
                <div className="h-4 bg-[#5b8c32] border-b-2 border-[#416823] relative">
                  <div className="absolute -bottom-1 left-2 w-1.5 h-1.5 bg-[#5b8c32] rotate-45" />
                  <div className="absolute -bottom-1 left-6 w-2 h-1.5 bg-[#5b8c32] rotate-45" />
                  <div className="absolute -bottom-1 left-10 w-1.5 h-1.5 bg-[#5b8c32] rotate-45" />
                </div>
                <div className="p-1 flex flex-wrap gap-1 opacity-50">
                  <div className="w-1 h-1 bg-[#23170d]" />
                  <div className="w-1.5 h-1 bg-[#6a492d] ml-auto" />
                  <div className="w-1 h-1.5 bg-[#23170d] mt-1" />
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-white font-mono tracking-tight truncate drop-shadow">
                    XIVIZLEY Minecraft Sunucusu
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-[#AAAAAA] drop-shadow">
                      0/{config.maxPlayers || 30}
                    </span>
                    <div className="flex items-end gap-0.5 h-3.5">
                      <div className="w-0.5 h-1 bg-emerald-400 rounded-sm" />
                      <div className="w-0.5 h-1.5 bg-emerald-400 rounded-sm" />
                      <div className="w-0.5 h-2 bg-emerald-400 rounded-sm" />
                      <div className="w-0.5 h-2.5 bg-emerald-400 rounded-sm" />
                      <div className="w-0.5 h-3.5 bg-emerald-400 rounded-sm" />
                    </div>
                  </div>
                </div>
                <div className="mt-1">
                  {renderMinecraftText(
                    config.motd ||
                      "&b&lXIVIZLEY &8| &fUltra Performanslı Sunucu\\n&a&l➤ &7Sürüm: &e1.21.x &8- &6Hoş Geldiniz!",
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#222933] border border-[#2d3748] shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#0082c9]/10 border border-[#0082c9]/30 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                  {game.icon}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white truncate">
                      {config.serverName ||
                        game.defaultConfig.serverName ||
                        `${game.name} Dedicated`}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {config.serverDesc ||
                      game.defaultConfig.serverDesc ||
                      game.tagline}
                  </p>
                  {config.map && (
                    <span className="text-[10px] text-[#0082c9] font-mono mt-1">
                      Harita: {config.map}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-white block">
                    0/{config.maxPlayers || game.defaultConfig.maxPlayers}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Port: {config.port || game.defaultPort}
                  </span>
                </div>
                <div className="flex items-end gap-0.5 h-3.5">
                  <div className="w-0.5 h-1 bg-emerald-400 rounded-sm" />
                  <div className="w-0.5 h-1.5 bg-emerald-400 rounded-sm" />
                  <div className="w-0.5 h-2 bg-emerald-400 rounded-sm" />
                  <div className="w-0.5 h-2.5 bg-emerald-400 rounded-sm" />
                  <div className="w-0.5 h-3.5 bg-emerald-400 rounded-sm" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Oyun Özel Alanları */}
        {activeGameId === "minecraft" ? (
          <>
            {/* MOTD Düzenleyici & Renk Çipleri */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">
                  MOTD Metni (Satır sonu için \n kullanabilirsiniz):
                </span>
                <span className="text-[10px] text-[#0082c9] font-mono">
                  Renk kodunu tıklayarak ekleyin
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_CHIPS.map((chip) => (
                  <button
                    key={chip.code}
                    type="button"
                    onClick={() => insertColorCode(chip.code)}
                    className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold border border-white/10 hover:border-white/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    style={{ backgroundColor: "rgba(20,20,25,0.7)" }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block border border-black/40"
                      style={{ backgroundColor: chip.hex }}
                    />
                    <span style={{ color: chip.hex }}>{chip.code}</span>
                    <span className="text-white/60 font-normal">
                      {chip.name}
                    </span>
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={config.motd || ""}
                onChange={(e) =>
                  updateConfig(activeGameId, { motd: e.target.value })
                }
                placeholder="&b&lXIVIZLEY &8| &fSunucu Başlığı\n&a&l➤ &7Sürüm 1.21.x..."
                className="w-full bg-[#181e24] border border-[#2d3748] rounded-lg p-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#0082c9] transition-colors resize-none"
              />
            </div>

            {/* Minecraft Ayar Kutuları */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[#2d3748]">
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#222933] border border-[#2d3748]">
                <span className="text-[11px] font-semibold text-white">
                  Giriş Türü:
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateConfig(activeGameId, { onlineMode: false })
                    }
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      config.onlineMode === false
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-[#181e24] text-slate-400 hover:text-white"
                    }`}
                  >
                    Korsan & Orijinal
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateConfig(activeGameId, { onlineMode: true })
                    }
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      config.onlineMode === true
                        ? "bg-[#0082c9]/20 text-[#38bdf8] border border-[#0082c9]/40"
                        : "bg-[#181e24] text-slate-400 hover:text-white"
                    }`}
                  >
                    Sadece Orijinal
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#222933] border border-[#2d3748]">
                <span className="text-[11px] font-semibold text-white">
                  Zorluk Seviyesi:
                </span>
                <div className="grid grid-cols-4 gap-1 mt-1">
                  {(["peaceful", "easy", "normal", "hard"] as const).map(
                    (diff) => {
                      const labels = {
                        peaceful: "Barışçıl",
                        easy: "Kolay",
                        normal: "Normal",
                        hard: "Zor",
                      };
                      const isSelected =
                        (config.difficulty || "normal") === diff;
                      return (
                        <button
                          key={diff}
                          type="button"
                          onClick={() =>
                            updateConfig(activeGameId, { difficulty: diff })
                          }
                          className={`py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#0082c9] text-white font-bold"
                              : "bg-[#181e24] text-slate-400 hover:text-white"
                          }`}
                        >
                          {labels[diff]}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#222933] border border-[#2d3748]">
                <span className="text-[11px] font-semibold text-white">
                  PvP (Savaş):
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => updateConfig(activeGameId, { pvp: true })}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      config.pvp !== false
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-[#181e24] text-slate-400 hover:text-white"
                    }`}
                  >
                    ⚔️ Açık
                  </button>
                  <button
                    type="button"
                    onClick={() => updateConfig(activeGameId, { pvp: false })}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      config.pvp === false
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-[#181e24] text-slate-400 hover:text-white"
                    }`}
                  >
                    🕊️ Barışçıl
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#222933] border border-[#2d3748]">
                <span className="text-[11px] font-semibold text-white">
                  Maksimum Oyuncu:
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={1}
                    max={250}
                    value={config.maxPlayers || 30}
                    onChange={(e) =>
                      updateConfig(activeGameId, {
                        maxPlayers: parseInt(e.target.value) || 30,
                      })
                    }
                    className="w-full bg-[#181e24] border border-[#2d3748] rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#0082c9]"
                  />
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    Slot
                  </span>
                </div>
              </div>
            </div>

            {/* Gelişmiş server.properties Parametreleri */}
            <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-[#1b222a] border border-[#2d3748]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>⚡</span> Gelişmiş Sunucu Parametreleri
                  (server.properties)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Çekirdek Düzeyi Yapılandırma
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Görüş Mesafesi */}
                <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[#222933] border border-[#2d3748]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-300">
                      Görüş Mesafesi:
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#0082c9]">
                      {config.viewDistance || 10} chunk
                    </span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={32}
                    value={config.viewDistance || 10}
                    onChange={(e) =>
                      updateConfig(activeGameId, {
                        viewDistance: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full h-1.5 bg-[#181e24] rounded-lg appearance-none cursor-pointer accent-[#0082c9]"
                  />
                </div>

                {/* Simülasyon Mesafesi */}
                <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[#222933] border border-[#2d3748]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-300">
                      Simülasyon:
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#0082c9]">
                      {config.simulationDistance || 8} chunk
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={24}
                    value={config.simulationDistance || 8}
                    onChange={(e) =>
                      updateConfig(activeGameId, {
                        simulationDistance: parseInt(e.target.value) || 8,
                      })
                    }
                    className="w-full h-1.5 bg-[#181e24] rounded-lg appearance-none cursor-pointer accent-[#0082c9]"
                  />
                </div>

                {/* Uçuş İzni (Allow Flight) */}
                <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[#222933] border border-[#2d3748]">
                  <span className="text-[11px] font-medium text-slate-300">
                    Uçuş İzni (Allow Flight):
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateConfig(activeGameId, { allowFlight: true })
                      }
                      className={`flex-1 py-1 rounded text-[10px] font-semibold transition-all ${
                        config.allowFlight
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-[#181e24] text-slate-400"
                      }`}
                    >
                      Açık
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateConfig(activeGameId, { allowFlight: false })
                      }
                      className={`flex-1 py-1 rounded text-[10px] font-semibold transition-all ${
                        !config.allowFlight
                          ? "bg-slate-700 text-white border border-slate-600"
                          : "bg-[#181e24] text-slate-400"
                      }`}
                    >
                      Kapalı
                    </button>
                  </div>
                </div>

                {/* Komut Blokları (Command Blocks) */}
                <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[#222933] border border-[#2d3748]">
                  <span className="text-[11px] font-medium text-slate-300">
                    Komut Blokları:
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateConfig(activeGameId, { enableCommandBlock: true })
                      }
                      className={`flex-1 py-1 rounded text-[10px] font-semibold transition-all ${
                        config.enableCommandBlock
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-[#181e24] text-slate-400"
                      }`}
                    >
                      Etkin
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateConfig(activeGameId, {
                          enableCommandBlock: false,
                        })
                      }
                      className={`flex-1 py-1 rounded text-[10px] font-semibold transition-all ${
                        !config.enableCommandBlock
                          ? "bg-slate-700 text-white border border-slate-600"
                          : "bg-[#181e24] text-slate-400"
                      }`}
                    >
                      Devre Dışı
                    </button>
                  </div>
                </div>
              </div>

              {/* Alt Satır: Hardcore, Seed & Spawn Koruması */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#2d3748]/60">
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-[#222933] border border-[#2d3748]">
                  <span className="text-[11px] font-medium text-slate-300">
                    Hardcore Mod (Tek Can):
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateConfig(activeGameId, { hardcore: !config.hardcore })
                    }
                    className={`mt-1 py-1.5 px-3 rounded text-[10px] font-bold transition-all text-center ${
                      config.hardcore
                        ? "bg-red-500/20 text-red-300 border border-red-500/40"
                        : "bg-[#181e24] text-slate-400 hover:text-white"
                    }`}
                  >
                    {config.hardcore ? "💀 Hardcore AKTİF" : "🛡️ Standart Mod"}
                  </button>
                </div>

                <div className="flex flex-col gap-1 p-2 rounded-lg bg-[#222933] border border-[#2d3748]">
                  <span className="text-[11px] font-medium text-slate-300">
                    Dünya Tohumu (Seed):
                  </span>
                  <input
                    type="text"
                    value={config.seed || ""}
                    onChange={(e) =>
                      updateConfig(activeGameId, { seed: e.target.value })
                    }
                    placeholder="Rastgele için boş bırakın..."
                    className="bg-[#181e24] border border-[#2d3748] rounded px-2.5 py-1 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#0082c9]"
                  />
                </div>

                <div className="flex flex-col gap-1 p-2 rounded-lg bg-[#222933] border border-[#2d3748]">
                  <span className="text-[11px] font-medium text-slate-300">
                    Spawn Koruma Yarıçapı:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={128}
                      value={
                        config.spawnProtection !== undefined
                          ? config.spawnProtection
                          : 16
                      }
                      onChange={(e) =>
                        updateConfig(activeGameId, {
                          spawnProtection: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-[#181e24] border border-[#2d3748] rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#0082c9]"
                    />
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      blok
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hızlı Yönetici & Konsol Kontrol Çubuğu */}
            <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-[#1b222a] border border-[#2d3748]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>🕹️</span> Hızlı Yönetici Komutları & Konsol Kısayolları
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  Canlı RCON / stdin Köprüsü
                </span>
              </div>

              {/* Hızlı 1-Tık Butonları */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <button
                  type="button"
                  disabled={!!quickCmdRunning}
                  onClick={() => sendQuickCommand("time set day")}
                  className="py-1.5 px-2 rounded-lg bg-[#222933] border border-[#2d3748] hover:border-amber-500/50 hover:bg-amber-500/10 text-white text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>☀️</span> Gündüz Yap
                </button>
                <button
                  type="button"
                  disabled={!!quickCmdRunning}
                  onClick={() => sendQuickCommand("weather clear")}
                  className="py-1.5 px-2 rounded-lg bg-[#222933] border border-[#2d3748] hover:border-sky-500/50 hover:bg-sky-500/10 text-white text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>🌧️</span> Havayı Aç
                </button>
                <button
                  type="button"
                  disabled={!!quickCmdRunning}
                  onClick={() => sendQuickCommand("save-all")}
                  className="py-1.5 px-2 rounded-lg bg-[#222933] border border-[#2d3748] hover:border-emerald-500/50 hover:bg-emerald-500/10 text-white text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>💾</span> Kaydet
                </button>
                <button
                  type="button"
                  disabled={!!quickCmdRunning}
                  onClick={() => sendQuickCommand("spark health")}
                  className="py-1.5 px-2 rounded-lg bg-[#222933] border border-[#2d3748] hover:border-purple-500/50 hover:bg-purple-500/10 text-white text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>📊</span> TPS Raporu
                </button>
                <button
                  type="button"
                  disabled={!!quickCmdRunning}
                  onClick={() => sendQuickCommand("whitelist on")}
                  className="py-1.5 px-2 rounded-lg bg-[#222933] border border-[#2d3748] hover:border-blue-500/50 hover:bg-blue-500/10 text-white text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>🛡️</span> Whitelist Aç
                </button>
                <button
                  type="button"
                  disabled={!!quickCmdRunning}
                  onClick={() => sendQuickCommand("whitelist off")}
                  className="py-1.5 px-2 rounded-lg bg-[#222933] border border-[#2d3748] hover:border-rose-500/50 hover:bg-rose-500/10 text-white text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>🔓</span> Whitelist Kapat
                </button>
              </div>

              {/* Hızlı OP ve Kick Giriş Alanları */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#2d3748]/60">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opPlayerName}
                    onChange={(e) => setOpPlayerName(e.target.value)}
                    placeholder="OP verilecek oyuncu adı..."
                    className="flex-1 bg-[#181e24] border border-[#2d3748] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0082c9] font-mono"
                  />
                  <button
                    type="button"
                    disabled={!opPlayerName.trim() || !!quickCmdRunning}
                    onClick={() => {
                      sendQuickCommand(`op ${opPlayerName.trim()}`);
                      setOpPlayerName("");
                    }}
                    className="py-1.5 px-3 rounded-lg bg-[#0082c9] text-white text-xs font-semibold hover:bg-[#006aa3] disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    👑 OP Ver
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={kickPlayerName}
                    onChange={(e) => setKickPlayerName(e.target.value)}
                    placeholder="Sunucudan atılacak oyuncu adı..."
                    className="flex-1 bg-[#181e24] border border-[#2d3748] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                  />
                  <button
                    type="button"
                    disabled={!kickPlayerName.trim() || !!quickCmdRunning}
                    onClick={() => {
                      sendQuickCommand(
                        `kick ${kickPlayerName.trim()} "Sunucu yöneticisi tarafından uzaklaştırıldınız."`,
                      );
                      setKickPlayerName("");
                    }}
                    className="py-1.5 px-3 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    👢 Oyuncu At
                  </button>
                </div>
              </div>

              {quickCmdFeedback && (
                <div className="text-[11px] p-2 rounded-lg bg-[#181e24] border border-[#2d3748] text-slate-200 font-mono text-center">
                  {quickCmdFeedback}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Diğer 8 Oyun İçin Gelişmiş Kimlik & Yapılandırma Alanları */
          <div className="flex flex-col gap-3 pt-2">
            {/* Sunucu Adı & Açıklaması */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-white">
                  Sunucu Başlığı (Hostname / Name):
                </span>
                <input
                  type="text"
                  value={config.serverName || ""}
                  onChange={(e) =>
                    updateConfig(activeGameId, { serverName: e.target.value })
                  }
                  placeholder="Sunucu başlığını girin..."
                  className="bg-[#181e24] border border-[#2d3748] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0082c9]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-white">
                  Sunucu Açıklaması / Alt Bilgi:
                </span>
                <input
                  type="text"
                  value={config.serverDesc || ""}
                  onChange={(e) =>
                    updateConfig(activeGameId, { serverDesc: e.target.value })
                  }
                  placeholder="Sunucu açıklamasını girin..."
                  className="bg-[#181e24] border border-[#2d3748] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0082c9]"
                />
              </div>
            </div>

            {/* CS2 Özel Harita & Mod Seçicileri */}
            {activeGameId === "cs2" && (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#222933] border border-[#2d3748]">
                <span className="text-[11px] font-semibold text-white">
                  Başlangıç Haritası:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    "de_dust2",
                    "de_mirage",
                    "de_inferno",
                    "de_nuke",
                    "de_anubis",
                    "de_ancient",
                  ].map((mapName) => (
                    <button
                      key={mapName}
                      type="button"
                      onClick={() =>
                        updateConfig(activeGameId, { map: mapName })
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                        (config.map || "de_dust2") === mapName
                          ? "bg-[#0082c9] text-white font-bold shadow-sm"
                          : "bg-[#181e24] text-slate-400 hover:text-white border border-[#2d3748]"
                      }`}
                    >
                      {mapName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Unturned Özel Harita Seçici */}
            {activeGameId === "unturned" && (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#222933] border border-[#2d3748]">
                <span className="text-[11px] font-semibold text-white">
                  Oynanacak Harita:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    "Washington",
                    "PEI",
                    "Russia",
                    "Germany",
                    "Türkiye (TR)",
                  ].map((mapName) => (
                    <button
                      key={mapName}
                      type="button"
                      onClick={() =>
                        updateConfig(activeGameId, { map: mapName })
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        (config.map || "Washington") === mapName
                          ? "bg-[#0082c9] text-white font-bold shadow-sm"
                          : "bg-[#181e24] text-slate-400 hover:text-white border border-[#2d3748]"
                      }`}
                    >
                      {mapName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ARK Özel Harita Seçici */}
            {activeGameId === "ark" && (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#222933] border border-[#2d3748]">
                <span className="text-[11px] font-semibold text-white">
                  ARK Haritası:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    "TheIsland",
                    "ScorchedEarth",
                    "Ragnarok",
                    "Aberration",
                    "Extinction",
                  ].map((mapName) => (
                    <button
                      key={mapName}
                      type="button"
                      onClick={() =>
                        updateConfig(activeGameId, { map: mapName })
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        (config.map || "TheIsland") === mapName
                          ? "bg-[#0082c9] text-white font-bold shadow-sm"
                          : "bg-[#181e24] text-slate-400 hover:text-white border border-[#2d3748]"
                      }`}
                    >
                      {mapName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Şifreli Oyunlar (Palworld, Valheim, ARK) */}
            {["palworld", "valheim", "ark"].includes(activeGameId) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-white">
                    Sunucu Giriş Şifresi (Opsiyonel):
                  </span>
                  <input
                    type="text"
                    value={config.serverPassword || ""}
                    onChange={(e) =>
                      updateConfig(activeGameId, {
                        serverPassword: e.target.value,
                      })
                    }
                    placeholder="Şifresiz açık giriş için boş bırakın..."
                    className="bg-[#181e24] border border-[#2d3748] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0082c9] font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-white">
                    Dünya Adı (World Name):
                  </span>
                  <input
                    type="text"
                    value={config.map || ""}
                    onChange={(e) =>
                      updateConfig(activeGameId, { map: e.target.value })
                    }
                    placeholder="Dedicated, XivizleyWorld..."
                    className="bg-[#181e24] border border-[#2d3748] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0082c9] font-mono"
                  />
                </div>
              </div>
            )}

            {/* Port & Max Players Alt Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#2d3748]/50">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-white">
                  Maksimum Oyuncu Kapasitesi:
                </span>
                <input
                  type="number"
                  value={config.maxPlayers}
                  onChange={(e) =>
                    updateConfig(activeGameId, {
                      maxPlayers: parseInt(e.target.value) || 10,
                    })
                  }
                  className="bg-[#181e24] border border-[#2d3748] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#0082c9]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-white">
                  Sunucu Bağlantı Portu:
                </span>
                <input
                  type="number"
                  value={config.port}
                  onChange={(e) =>
                    updateConfig(activeGameId, {
                      port: parseInt(e.target.value) || game.defaultPort,
                    })
                  }
                  className="bg-[#181e24] border border-[#2d3748] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#0082c9]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. HAZIR 1-TIK MOD VE EKLENTİ PAKETLERİ */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#1AD76F] flex items-center gap-1.5">
            <span>📦</span> 3. Hazır Mod & Eklenti Paketleri (
            {availableModPacks.length} Paket Uyumlu)
          </label>
          <span className="text-[11px] text-slate-400">
            {config.selectedPackIds.length} paket devrede
          </span>
        </div>

        <p className="text-[11px] text-slate-400 -mt-1.5">
          <span className="text-purple-400 font-semibold">
            Ana Oyun Türleri
          </span>{" "}
          (Skyblock, Survival, Faction) tek seçimdir;{" "}
          <span className="text-[#1AD76F] font-semibold">İlave Paketler</span>{" "}
          (Crossplay, Lobi, Optimizasyon) çoklu seçilip birleştirilebilir.
        </p>

        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          {availableModPacks.map((pack) => {
            const isSelected = config.selectedPackIds.includes(pack.id);
            const isGameMode =
              pack.packType === "gamemode" ||
              pack.mutuallyExclusiveGroup === "gamemode";
            return (
              <div
                key={pack.id}
                onClick={() => handleToggleModPack(pack.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  isSelected
                    ? isGameMode
                      ? "bg-purple-950/20 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
                      : "bg-[#1AD76F]/10 border-[#1AD76F]/40 shadow-[0_0_12px_rgba(26,215,111,0.15)]"
                    : "bg-[#121a26] border-[#1d2a3c] hover:border-[#1AD76F]/40"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type={isGameMode ? "radio" : "checkbox"}
                    checked={isSelected}
                    onChange={() => {}}
                    className={`mt-1 bg-[#181e24] border-[#2d3748] cursor-pointer ${
                      isGameMode
                        ? "text-purple-500 focus:ring-purple-500"
                        : "text-[#1AD76F] focus:ring-[#1AD76F] rounded"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-white">
                        {pack.name}
                      </h4>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          isGameMode
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-[#1AD76F]/15 text-[#1AD76F] border border-[#1AD76F]/30"
                        }`}
                      >
                        {isGameMode ? "Oyun Modu" : "İlave Paket"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {pack.description}
                    </p>
                    {pack.tags && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {pack.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/10"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 font-bold border border-sky-500/20 whitespace-nowrap">
                  +{pack.estimatedRamMb} MB
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. EKLENTİ & SCRİPT KÜTÜPHANESİ */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#0082c9] flex items-center gap-1.5">
            <span>🧩</span> 4. Eklenti ve Script Kütüphanesi (
            {availablePlugins.length} Eklenti/Mod Uyumlu)
          </label>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
            {config.enabledPluginIds.length} Aktif
          </span>
        </div>

        {/* Kategori Filtre Butonları */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map((cat) => {
            const isSelected = pluginCategory === cat;
            const count =
              cat === "ALL"
                ? availablePlugins.length
                : availablePlugins.filter((p) => p.category === cat).length;
            const label = cat === "ALL" ? "Tümü" : cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setPluginCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#0082c9] text-white font-semibold shadow-sm"
                    : "bg-[#222933] text-slate-400 hover:text-white border border-[#2d3748]"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {/* Arama Input */}
        <input
          type="text"
          value={pluginSearch}
          onChange={(e) => setPluginSearch(e.target.value)}
          placeholder="Eklenti adı, açıklama veya kategori ara..."
          className="w-full bg-[#181e24] border border-[#2d3748] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0082c9] transition-colors"
        />

        {/* Eklenti Listesi */}
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          {filteredPlugins.map((plugin) => {
            const isEnabled = config.enabledPluginIds.includes(plugin.id);
            const isRequired = !!plugin.isRequired;
            const isOneTime = !!plugin.isOneTimeTask;

            return (
              <div
                key={plugin.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  isEnabled
                    ? "bg-[#222933] border-[#2d3748] shadow-sm"
                    : "bg-[#181e24]/70 border-[#2d3748]/60 opacity-80"
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white">
                      {plugin.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/10">
                      {plugin.category}
                    </span>
                    {plugin.modrinthSlug && (
                      <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Modrinth
                      </span>
                    )}
                    {plugin.spigetId && (
                      <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        SpigotMC
                      </span>
                    )}
                    {isRequired && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                        ZORUNLU
                      </span>
                    )}
                    {isOneTime && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-medium border border-blue-500/30">
                        BAŞLANGIÇ GÖREVİ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {plugin.description}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isRequired}
                  onClick={() => togglePlugin(activeGameId, plugin.id)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0 ${
                    isRequired
                      ? "bg-[#0082c9]/40 cursor-not-allowed"
                      : isEnabled
                        ? "bg-[#0082c9]"
                        : "bg-[#2d3748]"
                  }`}
                  title={
                    isRequired
                      ? "Bu eklenti çekirdek için zorunludur ve kapatılamaz."
                      : undefined
                  }
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. UYGULA VE GERİ BİLDİRİM */}
      <div className="pt-3 border-t border-[#2d3748] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleApplyConfig}
          disabled={!isAdmin || isApplying}
          className="w-full py-2.5 px-4 rounded-xl bg-[#0082c9] text-white font-semibold text-xs hover:bg-[#006aa3] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          {!isAdmin ? (
            <>
              <span>🔒</span> Yapılandırma Uygulamak İçin Sağ Üstten Yönetici
              Girişi Yapın
            </>
          ) : isApplying ? (
            <>
              <span className="animate-spin text-sm">⏳</span> Yapılandırma
              Uygulanıyor...
            </>
          ) : (
            <>
              <span>💾</span> Yapılandırmayı Kaydet ve Uygula (İdempotent)
            </>
          )}
        </button>

        {applyResult && (
          <div
            className={`text-xs p-2.5 rounded-xl border text-center transition-all ${
              applyResult.ok
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-red-500/15 border-red-500/40 text-red-300"
            }`}
          >
            {applyResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
