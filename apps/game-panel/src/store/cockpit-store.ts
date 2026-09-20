// ============================================================
// XIVIZLEY Game Cockpit v2 — Zustand Store
// Tek Sekmeli SPA, Kalıcı Oyun Yapılandırması ve Reaktif Kontroller
// ============================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameId, ActiveServerConfig, ServerStatus } from "@xivizley/types";
import { GAME_CATALOG, GAME_LIST } from "@/data/game-catalog";

/** VDS Toplam RAM & Güvenlik Sınırları (Claude Tavsiyesi) */
export const TOTAL_HOST_RAM_MB = 8192;
export const HOST_SAFE_RAM_LIMIT_MB = Math.round(TOTAL_HOST_RAM_MB * 0.8); // 6554 MB (%80)

/** Başlangıçta tüm oyunların varsayılan konfigürasyon haritası */
function buildInitialConfigPerGame(): Record<GameId, ActiveServerConfig> {
  const initial: Partial<Record<GameId, ActiveServerConfig>> = {};
  for (const game of GAME_LIST) {
    initial[game.id] = { ...game.defaultConfig };
  }
  return initial as Record<GameId, ActiveServerConfig>;
}

/** Dinamik RAM Hesaplayıcı: minRam + overhead + JVM + Modpaketleri + (Plugin × 64MB) */
export function calculateEstimatedRamMb(gameId: GameId, config: ActiveServerConfig): number {
  const meta = GAME_CATALOG[gameId];
  if (!meta) return 2048;

  const engine = meta.engines.find((e) => e.id === config.engineId) || meta.engines[0];
  const engineOverhead = engine ? engine.overheadMb : 256;
  const jvmOverhead = engine?.jvmOverheadMb || 0; // Minecraft Java JVM payı

  // Seçili paketlerin RAM toplamı
  const packsRam = config.selectedPackIds.reduce((sum, packId) => {
    const pack = meta.modPacks.find((p) => p.id === packId);
    return sum + (pack ? pack.estimatedRamMb : 0);
  }, 0);

  // Çalışan eklentilerin toplamı (Tek seferlik Chunky gibi görevler hariç)
  const runningPluginsCount = config.enabledPluginIds.filter((pId) => {
    const plugin = meta.plugins.find((p) => p.id === pId);
    return !plugin?.isOneTimeTask;
  }).length;

  const pluginsRam = runningPluginsCount * 64;

  return meta.minRamMb + engineOverhead + jvmOverhead + packsRam + pluginsRam;
}

/** %15 Container Güvenlik Buffer'ı */
export function getContainerMemoryLimitMb(estimatedRamMb: number): number {
  return Math.round(estimatedRamMb * 1.15);
}

/** Host RAM Güvenlik Denetimi */
export function checkRamSafety(estimatedRamMb: number): {
  isSafe: boolean;
  limitMb: number;
  hostSafeLimitMb: number;
  reason?: string;
} {
  const limitMb = getContainerMemoryLimitMb(estimatedRamMb);
  if (limitMb > HOST_SAFE_RAM_LIMIT_MB) {
    return {
      isSafe: false,
      limitMb,
      hostSafeLimitMb: HOST_SAFE_RAM_LIMIT_MB,
      reason: `Tahmini bellek limiti (${limitMb} MB), host güvenli sınırını (%80 = ${HOST_SAFE_RAM_LIMIT_MB} MB) aşıyor! Çökme (OOM Killer) riskine karşı lütfen paket/eklenti azaltın.`,
    };
  }
  return {
    isSafe: true,
    limitMb,
    hostSafeLimitMb: HOST_SAFE_RAM_LIMIT_MB,
  };
}

export interface GameCockpitStore {
  /** Aktif görüntülenen oyun */
  activeGameId: GameId;
  /** Oyun başına kaydedilen yapılandırma önbelleği (oyun geçişlerinde seçimler ASLA kaybolmaz) */
  configPerGame: Record<GameId, ActiveServerConfig>;
  /** Canlı çalışan sunucu durumu */
  activeServer: {
    containerId: string;
    gameId: GameId;
    status: ServerStatus;
  } | null;

  /** Arayüz state'leri */
  isStarting: boolean;
  isStopping: boolean;
  actionMessage: string | null;

  // Actions
  setActiveGame: (id: GameId) => void;
  updateConfig: (gameId: GameId, patch: Partial<ActiveServerConfig>) => void;
  toggleModPack: (gameId: GameId, packId: string) => void;
  togglePlugin: (gameId: GameId, pluginId: string) => void;
  setActiveServer: (server: GameCockpitStore["activeServer"]) => void;
  setActionStatus: (isStarting: boolean, isStopping: boolean, message?: string | null) => void;
  getEstimatedRam: (gameId: GameId) => number;
  canStartActiveGame: () => { allowed: boolean; reason?: string | undefined };
}

export const useGameStore = create<GameCockpitStore>()(
  persist(
    (set, get) => ({
      activeGameId: "fivem",
      configPerGame: buildInitialConfigPerGame(),
      activeServer: null,
      isStarting: false,
      isStopping: false,
      actionMessage: null,

      setActiveGame: (id: GameId) => {
        set({ activeGameId: id });
      },

      updateConfig: (gameId: GameId, patch: Partial<ActiveServerConfig>) => {
        set((state) => {
          const currentConfig = state.configPerGame[gameId] || GAME_CATALOG[gameId].defaultConfig;
          return {
            configPerGame: {
              ...state.configPerGame,
              [gameId]: { ...currentConfig, ...patch },
            },
          };
        });
      },

      toggleModPack: (gameId: GameId, packId: string) => {
        set((state) => {
          const current = state.configPerGame[gameId] || GAME_CATALOG[gameId].defaultConfig;
          const exists = current.selectedPackIds.includes(packId);
          const next = exists
            ? current.selectedPackIds.filter((id) => id !== packId)
            : [...current.selectedPackIds, packId];
          return {
            configPerGame: {
              ...state.configPerGame,
              [gameId]: { ...current, selectedPackIds: next },
            },
          };
        });
      },

      togglePlugin: (gameId: GameId, pluginId: string) => {
        set((state) => {
          const current = state.configPerGame[gameId] || GAME_CATALOG[gameId].defaultConfig;
          const plugin = GAME_CATALOG[gameId]?.plugins.find((p) => p.id === pluginId);
          // Zorunlu eklenti kapatılamaz
          if (plugin?.isRequired) return state;

          const exists = current.enabledPluginIds.includes(pluginId);
          const next = exists
            ? current.enabledPluginIds.filter((id) => id !== pluginId)
            : [...current.enabledPluginIds, pluginId];
          return {
            configPerGame: {
              ...state.configPerGame,
              [gameId]: { ...current, enabledPluginIds: next },
            },
          };
        });
      },

      setActiveServer: (server) => {
        set({ activeServer: server });
      },

      setActionStatus: (isStarting, isStopping, message = null) => {
        set({ isStarting, isStopping, actionMessage: message });
      },

      getEstimatedRam: (gameId: GameId) => {
        const config = get().configPerGame[gameId] || GAME_CATALOG[gameId].defaultConfig;
        return calculateEstimatedRamMb(gameId, config);
      },

      canStartActiveGame: () => {
        const state = get();
        const active = state.activeServer;
        const targetId = state.activeGameId;

        // Kural: Aynı anda sadece 1 oyun çalışabilir (Claude Tavsiyesi)
        if (active && (active.status === "running" || active.status === "starting")) {
          if (active.gameId !== targetId) {
            const runningGame = GAME_CATALOG[active.gameId]?.name || active.gameId;
            return {
              allowed: false,
              reason: `Şu anda arka planda ${runningGame} çalışıyor. VDS kaynaklarını korumak için önce çalışan sunucuyu durdurmalısınız.`,
            };
          }
        }

        // RAM Sınırı Kontrolü
        const estimated = state.getEstimatedRam(targetId);
        const safety = checkRamSafety(estimated);
        if (!safety.isSafe) {
          return { allowed: false, reason: safety.reason };
        }

        return { allowed: true };
      },
    }),
    {
      name: "xivizley-cockpit-v2",
      skipHydration: true, // Next.js 15 SSR Hydration Mismatch Koruması (Claude Tavsiyesi)
      partialize: (state) => ({
        activeGameId: state.activeGameId,
        configPerGame: state.configPerGame,
      }),
    }
  )
);
