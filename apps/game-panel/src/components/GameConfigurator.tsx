"use client";

import { useState, useMemo } from "react";
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
  a: "#55FF55",   // Açık Yeşil
  b: "#55FFFF",   // Camgöbeği
  c: "#FF5555",   // Açık Kırmızı
  d: "#FF55FF",   // Pembe
  e: "#FFFF55",   // Sarı
  f: "#FFFFFF",   // Beyaz
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
  if (!text) return <span className="text-white/40 italic">MOTD tanımlanmadı</span>;

  // Gerçek satır sonlarını ve \n metin karakterlerini ayır
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
  } = useGameStore();

  const [pluginCategory, setPluginCategory] = useState<string>("ALL");
  const [pluginSearch, setPluginSearch] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; message: string } | null>(null);

  const game = GAME_CATALOG[activeGameId];
  const config = configPerGame[activeGameId] || game.defaultConfig;
  const currentEngine = game.engines.find((e) => e.id === config.engineId) || game.engines[0];

  // Eklenti kategorileri
  const categories = useMemo(() => {
    const set = new Set<string>();
    game.plugins.forEach((p) => set.add(p.category));
    return ["ALL", ...Array.from(set)];
  }, [game.plugins]);

  // Filtrelenmiş eklentiler
  const filteredPlugins = useMemo(() => {
    return game.plugins.filter((p) => {
      const matchCat = pluginCategory === "ALL" || p.category === pluginCategory;
      const matchSearch =
        !pluginSearch.trim() ||
        p.name.toLowerCase().includes(pluginSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(pluginSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(pluginSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [game.plugins, pluginCategory, pluginSearch]);

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
    <div className="flex flex-col gap-6 p-6 bg-aurora-bg-card/40 border border-aurora-border-light/20 rounded-2xl backdrop-blur-sm">
      {/* Oyun Başlık & Üst Bilgi */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-aurora-border-light/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{game.icon}</span>
            <h2 className="text-xl font-bold text-white">{game.name} Yapılandırması</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-aurora-cyan/15 text-aurora-cyan border border-aurora-cyan/30">
              {game.badge}
            </span>
          </div>
          <p className="text-xs text-aurora-text-muted mt-1">{game.tagline}</p>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-[11px] text-aurora-text-muted/70 block">İzole Hacim:</span>
          <span className="font-mono text-xs text-aurora-cyan/90 bg-aurora-bg-dark/80 px-2 py-0.5 rounded border border-aurora-border-light/30">
            {game.volumeName}
          </span>
        </div>
      </div>

      {/* 1. MOTOR & SÜRÜM SEÇİM MENÜSÜ */}
      <div className="flex flex-col gap-4 p-4 rounded-2xl bg-aurora-bg-dark/70 border border-aurora-border-light/30 shadow-inner">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-aurora-cyan flex items-center gap-1.5">
            <span>⚙️</span> 1. Oyun Motoru ve Sürüm Seçimi ({game.engines.length} Motor Mevcut)
          </label>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            Seçili: {currentEngine?.name.split(" ")[0]} v{config.version}
          </span>
        </div>

        {/* Motor Seçici Kartları */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium text-aurora-text-muted">Sunucu Çekirdeği / Motoru:</span>
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
                      version: eng.defaultVersion || eng.versions[0] || "latest",
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-aurora-cyan/15 border-aurora-cyan text-white shadow-[0_0_12px_rgba(0,242,254,0.15)] ring-1 ring-aurora-cyan"
                      : "bg-aurora-bg-card/40 border-aurora-border-light/20 text-aurora-text-muted hover:border-aurora-border-light/50 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs text-white">{eng.name}</span>
                    <span className="text-[10px] font-mono text-aurora-cyan/90 shrink-0">+{eng.overheadMb} MB</span>
                  </div>
                  <span className="text-[10px] text-aurora-text-muted/60 mt-1 font-mono">
                    {eng.versions.length} resmi sürüm
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sürüm Seçim Menüsü */}
        <div className="flex flex-col gap-2.5 pt-3 border-t border-aurora-border-light/15">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-aurora-text-muted flex items-center gap-1.5">
              <span>🎯</span> {currentEngine?.name.split(" ")[0]} Sürümleri ({currentEngine?.versions.length || 0} Adet):
            </span>
            <span className="text-[10px] text-aurora-cyan/80 font-mono">1-Tıkla Sürüm Değiştir</span>
          </div>

          {/* Sürüm Hapları (Scrollable & Responsive) */}
          <div className="flex items-center gap-1.5 flex-wrap max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-aurora-border-light/30">
            {(currentEngine?.versions || ["latest"]).map((v) => {
              const isSelected = config.version === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateConfig(activeGameId, { version: v })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? "bg-aurora-cyan text-aurora-bg-dark font-bold shadow-[0_0_12px_rgba(0,242,254,0.4)] scale-105"
                      : "bg-aurora-bg-dark text-white/80 hover:text-white hover:bg-aurora-bg-card border border-aurora-border-light/30"
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-aurora-cyan">
                Özel Sürüm:
              </span>
              <input
                type="text"
                placeholder="Örn: 1.21.4, 1.20.1 veya snapshot..."
                value={config.version}
                onChange={(e) => updateConfig(activeGameId, { version: e.target.value })}
                className="w-full bg-aurora-bg-dark border border-aurora-border-light/30 rounded-xl pl-24 pr-3 py-2 text-xs font-mono text-white placeholder-aurora-text-muted/40 focus:outline-none focus:border-aurora-cyan transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUNUCU GÖRÜNÜMÜ & MOTD & OYNANIŞ AYARLARI */}
      {activeGameId === "minecraft" ? (
        <div className="flex flex-col gap-4 p-4 rounded-2xl bg-aurora-bg-dark/70 border border-aurora-border-light/30 shadow-inner">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-aurora-cyan flex items-center gap-1.5">
              <span>🏷️</span> 2. Sunucu Görünümü & MOTD (Message of the Day)
            </label>
            <span className="text-[10px] font-mono text-aurora-cyan/80 bg-aurora-cyan/10 px-2 py-0.5 rounded-full border border-aurora-cyan/20">
              Minecraft Java & Bedrock Uyumlu
            </span>
          </div>

          {/* Minecraft Çok Oyunculu Sunucu Listesi Canlı Önizleme Kartı */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-aurora-text-muted flex items-center gap-1.5">
              <span>🎮</span> Çok Oyunculu Menüsü Canlı Önizlemesi (Piksel Birebir):
            </span>

            <div className="p-3 rounded-xl bg-[#18181b] border-2 border-[#27272a] shadow-2xl flex items-center gap-3.5 select-none">
              {/* Sunucu İkonu (Minecraft Çimen Bloğu Görseli) */}
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

              {/* Sunucu Bilgileri & MOTD */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-white font-mono tracking-tight truncate drop-shadow">
                    XIVIZLEY Minecraft Sunucusu
                  </span>
                  {/* Ping ve Oyuncu Sayısı */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-[#AAAAAA] drop-shadow">
                      0/{config.maxPlayers || 30}
                    </span>
                    <div className="flex items-end gap-0.5 h-3.5" title="Gecikme: ~12ms">
                      <div className="w-0.5 h-1 bg-emerald-400 rounded-sm" />
                      <div className="w-0.5 h-1.5 bg-emerald-400 rounded-sm" />
                      <div className="w-0.5 h-2 bg-emerald-400 rounded-sm" />
                      <div className="w-0.5 h-2.5 bg-emerald-400 rounded-sm" />
                      <div className="w-0.5 h-3.5 bg-emerald-400 rounded-sm" />
                    </div>
                  </div>
                </div>

                {/* Dinamik MOTD Metni */}
                <div className="mt-1">
                  {renderMinecraftText(
                    config.motd ||
                      "&b&lXIVIZLEY &8| &fUltra Performanslı Sunucu\\n&a&l➤ &7Sürüm: &e1.21.x &8- &6Hoş Geldiniz!"
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MOTD Düzenleyici & Renk Çipleri */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-aurora-text-muted">
                MOTD Metni (Satır sonu için \n kullanabilirsiniz):
              </span>
              <span className="text-[10px] text-aurora-cyan/80 font-mono">
                Renk kodunu tıklayarak ekleyin
              </span>
            </div>

            {/* Hızlı Renk Ekleme Butonları */}
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
                  <span className="text-white/60 font-normal">{chip.name}</span>
                </button>
              ))}
            </div>

            {/* MOTD Input Alanı */}
            <textarea
              rows={2}
              value={config.motd || ""}
              onChange={(e) => updateConfig(activeGameId, { motd: e.target.value })}
              placeholder="&b&lXIVIZLEY &8| &fSunucu Başlığı\n&a&l➤ &7Sürüm 1.21.x..."
              className="w-full bg-aurora-bg-dark border border-aurora-border-light/30 rounded-xl p-3 text-xs font-mono text-white placeholder-aurora-text-muted/40 focus:outline-none focus:border-aurora-cyan transition-colors resize-none"
            />
          </div>

          {/* Oyun ve Güvenlik Ayarları (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-aurora-border-light/15">
            {/* Korsan / Online Mode */}
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-aurora-bg-card/40 border border-aurora-border-light/20">
              <span className="text-[11px] font-semibold text-white flex items-center justify-between">
                <span>Giriş Türü (Online Mode):</span>
              </span>
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => updateConfig(activeGameId, { onlineMode: false })}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                    config.onlineMode === false
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-aurora-bg-dark text-aurora-text-muted hover:text-white"
                  }`}
                >
                  Korsan & Orijinal (TLauncher)
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig(activeGameId, { onlineMode: true })}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                    config.onlineMode === true
                      ? "bg-aurora-cyan/20 text-aurora-cyan border border-aurora-cyan/40"
                      : "bg-aurora-bg-dark text-aurora-text-muted hover:text-white"
                  }`}
                >
                  Sadece Orijinal
                </button>
              </div>
            </div>

            {/* Zorluk Seviyesi */}
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-aurora-bg-card/40 border border-aurora-border-light/20">
              <span className="text-[11px] font-semibold text-white">Zorluk Seviyesi:</span>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {(["peaceful", "easy", "normal", "hard"] as const).map((diff) => {
                  const labels = { peaceful: "Barışçıl", easy: "Kolay", normal: "Normal", hard: "Zor" };
                  const isSelected = (config.difficulty || "normal") === diff;
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => updateConfig(activeGameId, { difficulty: diff })}
                      className={`py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-aurora-cyan text-aurora-bg-dark font-bold"
                          : "bg-aurora-bg-dark text-aurora-text-muted hover:text-white"
                      }`}
                    >
                      {labels[diff]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PvP Açık / Kapalı */}
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-aurora-bg-card/40 border border-aurora-border-light/20">
              <span className="text-[11px] font-semibold text-white">PvP (Savaş):</span>
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => updateConfig(activeGameId, { pvp: true })}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                    config.pvp !== false
                      ? "bg-red-500/20 text-red-300 border border-red-500/40"
                      : "bg-aurora-bg-dark text-aurora-text-muted hover:text-white"
                  }`}
                >
                  ⚔️ Açık (Savaş)
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig(activeGameId, { pvp: false })}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                    config.pvp === false
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-aurora-bg-dark text-aurora-text-muted hover:text-white"
                  }`}
                >
                  🕊️ Barışçıl
                </button>
              </div>
            </div>

            {/* Max Players & Port */}
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-aurora-bg-card/40 border border-aurora-border-light/20">
              <span className="text-[11px] font-semibold text-white">Maksimum Oyuncu Kapasitesi:</span>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min={1}
                  max={250}
                  value={config.maxPlayers || 30}
                  onChange={(e) =>
                    updateConfig(activeGameId, { maxPlayers: parseInt(e.target.value) || 30 })
                  }
                  className="w-full bg-aurora-bg-dark border border-aurora-border-light/30 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-aurora-cyan"
                />
                <span className="text-[10px] text-aurora-text-muted font-mono shrink-0">Oyuncu</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Diğer Oyunlar İçin Genel Ayarlar */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-aurora-bg-dark/70 border border-aurora-border-light/30 shadow-inner">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white">Maksimum Oyuncu:</span>
            <input
              type="number"
              value={config.maxPlayers}
              onChange={(e) => updateConfig(activeGameId, { maxPlayers: parseInt(e.target.value) || 10 })}
              className="bg-aurora-bg-dark border border-aurora-border-light/30 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-aurora-cyan"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white">Port Numarası:</span>
            <input
              type="number"
              value={config.port}
              onChange={(e) => updateConfig(activeGameId, { port: parseInt(e.target.value) || game.defaultPort })}
              className="bg-aurora-bg-dark border border-aurora-border-light/30 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-aurora-cyan"
            />
          </div>
        </div>
      )}

      {/* 3. HAZIR 1-TIK MODPAKETLERİ */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-aurora-cyan flex items-center gap-1.5">
            <span>📦</span> 3. Hazır Mod Paketleri
          </label>
          <span className="text-[11px] text-aurora-text-muted">
            {config.selectedPackIds.length} paket seçildi
          </span>
        </div>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-aurora-border-light/30">
          {game.modPacks.map((pack) => {
            const isSelected = config.selectedPackIds.includes(pack.id);
            return (
              <div
                key={pack.id}
                onClick={() => toggleModPack(activeGameId, pack.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  isSelected
                    ? "bg-aurora-cyan/10 border-aurora-cyan/40 shadow-[0_0_10px_rgba(0,242,254,0.1)]"
                    : "bg-aurora-bg-dark/50 border-aurora-border-light/20 hover:border-aurora-border-light/40"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-0.5 rounded bg-aurora-bg-dark border-aurora-border-light text-aurora-cyan focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <div>
                    <h4 className="text-xs font-semibold text-white">{pack.name}</h4>
                    <p className="text-[11px] text-aurora-text-muted mt-0.5 leading-relaxed">
                      {pack.description}
                    </p>
                    {pack.tags && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {pack.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-aurora-text-muted border border-white/10"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-aurora-cyan font-bold border border-aurora-cyan/20 whitespace-nowrap">
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
          <label className="text-xs font-semibold uppercase tracking-wider text-aurora-cyan flex items-center gap-1.5">
            <span>🧩</span> 4. Eklenti ve Script Kütüphanesi ({game.plugins.length} Adet)
          </label>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
            {config.enabledPluginIds.length} Aktif
          </span>
        </div>

        {/* Kategori Filtre Butonları */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map((cat) => {
            const isSelected = pluginCategory === cat;
            const count = cat === "ALL" ? game.plugins.length : game.plugins.filter((p) => p.category === cat).length;
            const label = cat === "ALL" ? "Tümü" : cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setPluginCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-aurora-cyan text-aurora-bg-dark font-bold shadow-[0_0_10px_rgba(0,242,254,0.3)]"
                    : "bg-aurora-bg-dark text-aurora-text-muted hover:text-white border border-aurora-border-light/20"
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
          className="w-full bg-aurora-bg-dark border border-aurora-border-light/30 rounded-xl px-3 py-2 text-xs text-white placeholder-aurora-text-muted/50 focus:outline-none focus:border-aurora-cyan transition-colors"
        />

        {/* Eklenti Listesi */}
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-aurora-border-light/30">
          {filteredPlugins.map((plugin) => {
            const isEnabled = config.enabledPluginIds.includes(plugin.id);
            const isRequired = !!plugin.isRequired;
            const isOneTime = !!plugin.isOneTimeTask;

            return (
              <div
                key={plugin.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  isEnabled
                    ? "bg-aurora-bg-dark/80 border-aurora-border-light/40 shadow-sm"
                    : "bg-aurora-bg-dark/30 border-aurora-border-light/10 opacity-70"
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white">{plugin.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-aurora-text-muted border border-white/10">
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
                  <p className="text-[11px] text-aurora-text-muted mt-0.5 leading-relaxed">
                    {plugin.description}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isRequired}
                  onClick={() => togglePlugin(activeGameId, plugin.id)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0 ${
                    isRequired
                      ? "bg-aurora-cyan/40 cursor-not-allowed"
                      : isEnabled
                      ? "bg-aurora-cyan"
                      : "bg-aurora-border-light/40"
                  }`}
                  title={isRequired ? "Bu eklenti çekirdek için zorunludur ve kapatılamaz." : undefined}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-aurora-bg-dark shadow transform transition-transform ${
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
      <div className="pt-3 border-t border-aurora-border-light/20 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleApplyConfig}
          disabled={isApplying}
          className="w-full py-2.5 px-4 rounded-xl bg-aurora-cyan text-aurora-bg-dark font-bold text-xs hover:bg-aurora-cyan/90 transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          {isApplying ? (
            <>
              <span className="animate-spin text-sm">⏳</span> Yapılandırma Uygulanıyor...
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
