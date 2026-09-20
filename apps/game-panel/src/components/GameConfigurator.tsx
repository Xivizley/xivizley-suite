"use client";

import { useState } from "react";
import { useGameStore, calculateEstimatedRamMb } from "@/store/cockpit-store";
import { GAME_CATALOG } from "@/data/game-catalog";

export function GameConfigurator() {
  const {
    activeGameId,
    configPerGame,
    updateConfig,
    toggleModPack,
    togglePlugin,
    setActionStatus,
  } = useGameStore();

  const [pluginSearch, setPluginSearch] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; message: string } | null>(null);

  const game = GAME_CATALOG[activeGameId];
  const config = configPerGame[activeGameId] || game.defaultConfig;
  const currentEngine = game.engines.find((e) => e.id === config.engineId) || game.engines[0];

  // Filtrelenmiş eklentiler
  const filteredPlugins = game.plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(pluginSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(pluginSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(pluginSearch.toLowerCase())
  );

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
      setTimeout(() => setApplyResult(null), 4000);
    }
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
            <span>⚙️</span> 1. Oyun Motoru ve Sürüm Seçimi
          </label>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
            Aktif: {currentEngine?.name.split(" ")[0]} v{config.version}
          </span>
        </div>

        {/* Motor Seçici Kartları */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium text-aurora-text-muted">Sunucu Motoru / Çekirdeği:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                </button>
              );
            })}
          </div>
        </div>

        {/* Sürüm Seçim Menüsü (Tıklanabilir Haplar + Özel Giriş) */}
        <div className="flex flex-col gap-2.5 pt-3 border-t border-aurora-border-light/15">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-aurora-text-muted flex items-center gap-1.5">
              <span>🎯</span> Sürüm Menüsü ({currentEngine?.name.split(" ")[0]}):
            </span>
            <span className="text-[10px] text-aurora-cyan/80 font-mono">1-Tıkla Sürüm Değiştir</span>
          </div>

          {/* Hızlı Seçim Butonları / Sürüm Hapları */}
          <div className="flex items-center gap-1.5 flex-wrap">
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

          {/* Özel / Manuel Sürüm Giriş Alanı */}
          <div className="flex items-center gap-2 mt-1">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-aurora-cyan">
                Özel Sürüm:
              </span>
              <input
                type="text"
                placeholder="Örn: 1.21.4, 1.20.1 veya latest..."
                value={config.version}
                onChange={(e) => updateConfig(activeGameId, { version: e.target.value })}
                className="w-full bg-aurora-bg-dark border border-aurora-border-light/30 rounded-xl pl-24 pr-3 py-2 text-xs font-mono text-white placeholder-aurora-text-muted/40 focus:outline-none focus:border-aurora-cyan transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. HAZIR 1-TIK MODPAKETLERİ */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-aurora-cyan flex items-center gap-1.5">
            <span>📦</span> 2. Hazır Mod Paketleri
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
                    onChange={() => {}} // onClick parent'ta handle ediliyor
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

      {/* 3. EKLENTİ & SCRİPT KÜTÜPHANESİ */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-aurora-cyan flex items-center gap-1.5">
            <span>🧩</span> 3. Eklenti ve Script Kütüphanesi
          </label>
          <span className="text-[11px] text-aurora-text-muted">
            {config.enabledPluginIds.length} aktif
          </span>
        </div>

        {/* Arama Input */}
        <input
          type="text"
          value={pluginSearch}
          onChange={(e) => setPluginSearch(e.target.value)}
          placeholder="Eklenti veya kategori ara..."
          className="w-full bg-aurora-bg-dark border border-aurora-border-light/30 rounded-xl px-3 py-1.5 text-xs text-white placeholder-aurora-text-muted/50 focus:outline-none focus:border-aurora-cyan transition-colors"
        />

        <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-aurora-border-light/30">
          {filteredPlugins.map((plugin) => {
            const isEnabled = config.enabledPluginIds.includes(plugin.id);
            const isRequired = !!plugin.isRequired;
            const isOneTime = !!plugin.isOneTimeTask;

            return (
              <div
                key={plugin.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  isEnabled
                    ? "bg-aurora-bg-dark/80 border-aurora-border-light/40"
                    : "bg-aurora-bg-dark/30 border-aurora-border-light/10 opacity-70"
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white">{plugin.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-aurora-text-muted">
                      {plugin.category}
                    </span>
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
                  <p className="text-[11px] text-aurora-text-muted mt-0.5">{plugin.description}</p>
                </div>

                <button
                  type="button"
                  disabled={isRequired}
                  onClick={() => togglePlugin(activeGameId, plugin.id)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                    isRequired
                      ? "bg-aurora-cyan/40 cursor-not-allowed"
                      : isEnabled
                      ? "bg-aurora-cyan"
                      : "bg-aurora-border-light/40"
                  }`}
                  title={isRequired ? "Bu eklenti motor için zorunludur ve kapatılamaz." : undefined}
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

      {/* UYGULA VE GERİ BİLDİRİM */}
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
