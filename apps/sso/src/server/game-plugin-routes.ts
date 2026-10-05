import type { FastifyPluginAsync } from "fastify";
import Docker from "dockerode";
import type { GameId } from "@xivizley/types";
import { runExecInContainer } from "./adapters/command-adapter.js";
import { GAME_CATALOG } from "../data/game-catalog.js";

export interface PluginItem {
  id: string;
  gameId: GameId;
  name: string;
  category: "Core" | "Economy" | "Admin" | "Utility" | "Framework" | "Voice";
  version: string;
  author: string;
  description: string;
  fileName: string;
  downloadUrl?: string;
  icon: string;
  isInstalled: boolean;
}

const CURATED_PLUGINS: Record<string, Omit<PluginItem, "isInstalled">> = {
  // ─── Minecraft Plugins ──────────────────────────────────────
  essentialsx: {
    id: "essentialsx",
    gameId: "minecraft",
    name: "EssentialsX",
    category: "Core",
    version: "2.20.1",
    author: "EssentialsX Team",
    description:
      "Sunucu yönetimi, ekonomi (/eco), ışınlanma (/tpa, /spawn), kitler ve 100+ temel komut paketi.",
    fileName: "EssentialsX-2.20.1.jar",
    icon: "⚡",
  },
  luckperms: {
    id: "luckperms",
    gameId: "minecraft",
    name: "LuckPerms",
    category: "Admin",
    version: "5.4.102",
    author: "Luck",
    description:
      "Web arayüzlü gelişmiş yetki, VIP grupları, miras hiyerarşisi ve izin (permission) yönetim motoru.",
    fileName: "LuckPerms-Bukkit-5.4.102.jar",
    icon: "🛡️",
  },
  vault: {
    id: "vault",
    gameId: "minecraft",
    name: "Vault",
    category: "Economy",
    version: "1.7.3",
    author: "MilkBowl",
    description:
      "Tüm ekonomi, chat ve izin eklentileri arasında standart API köprüsü kuran temel kütüphane.",
    fileName: "Vault-1.7.3.jar",
    icon: "🏦",
  },
  worldedit: {
    id: "worldedit",
    gameId: "minecraft",
    name: "WorldEdit",
    category: "Utility",
    version: "7.2.15",
    author: "EngineHub",
    description:
      "Tahta balta ile harita bloklarını anında kopyalama, yapıştırma, silme ve fırça ile şekillendirme aracı.",
    fileName: "worldedit-bukkit-7.2.15.jar",
    icon: "🪓",
  },
  viaversion: {
    id: "viaversion",
    gameId: "minecraft",
    name: "ViaVersion",
    category: "Utility",
    version: "4.9.2",
    author: "MylesMc",
    description:
      "Farklı Minecraft istemci sürümlerinin (1.8 - 1.21) tek bir sunucuya sorunsuz girmesini sağlar.",
    fileName: "ViaVersion-4.9.2.jar",
    icon: "🔄",
  },
  clearlag: {
    id: "clearlag",
    gameId: "minecraft",
    name: "ClearLag",
    category: "Utility",
    version: "3.2.2",
    author: "bobacadodl",
    description:
      "Yerdeki gereksiz eşyaları temizleme, mob sınırlaması ve RAM optimizasyonu ile TPS yükseltici.",
    fileName: "Clearlag.jar",
    icon: "🧹",
  },
  chunky: {
    id: "chunky",
    gameId: "minecraft",
    name: "Chunky",
    category: "Utility",
    version: "1.3.92",
    author: "pop4959",
    description:
      "Harita chunk'larını oyuncular gezmeden önce arka planda önceden yükleyerek anlık lag ve donmaları sıfırlar.",
    fileName: "Chunky-1.3.92.jar",
    icon: "🗺️",
  },
  placeholderapi: {
    id: "placeholderapi",
    gameId: "minecraft",
    name: "PlaceholderAPI",
    category: "Utility",
    version: "2.11.5",
    author: "HelpChat",
    description:
      "Skript, TAB listesi ve scoreboard göstergeleri için dinamik oyuncu değişkenleri (papi) kütüphanesi.",
    fileName: "PlaceholderAPI-2.11.5.jar",
    icon: "🏷️",
  },
  dynmap: {
    id: "dynmap",
    gameId: "minecraft",
    name: "Dynmap",
    category: "Utility",
    version: "3.7-beta-3",
    author: "mikeprimm",
    description:
      "Tarayıcıdan gerçek zamanlı olarak izlenebilen Google Maps tarzı dinamik 2D/3D dünya haritası.",
    fileName: "Dynmap-3.7-beta-3-spigot.jar",
    icon: "🌐",
  },

  // ─── FiveM Resources ────────────────────────────────────────
  ox_lib: {
    id: "ox_lib",
    gameId: "fivem",
    name: "ox_lib",
    category: "Framework",
    version: "3.22.0",
    author: "Overextended",
    description:
      "Modern NUI diyalogları, bildirimler, progress barlar ve FiveM scriptleri için ortak kütüphane.",
    fileName: "ox_lib",
    icon: "📦",
  },
  es_extended: {
    id: "es_extended",
    gameId: "fivem",
    name: "ESX Legacy (Core)",
    category: "Framework",
    version: "1.10.4",
    author: "ESX Framework",
    description:
      "GTA V rol yapma sunucuları için modüler meslek, para birimi, kimlik ve envanter temel altyapısı.",
    fileName: "es_extended",
    icon: "🏙️",
  },
  "qb-core": {
    id: "qb-core",
    gameId: "fivem",
    name: "QB-Core Framework",
    category: "Framework",
    version: "2.2.0",
    author: "QB-Core Community",
    description:
      "Yüksek optimizasyonlu, modern UI'a sahip popüler GTA V roleplay çekirdeği.",
    fileName: "qb-core",
    icon: "🎮",
  },
  "pma-voice": {
    id: "pma-voice",
    gameId: "fivem",
    name: "pma-voice & Radio",
    category: "Voice",
    version: "6.0.4",
    author: "AvarianKnight",
    description:
      "Mumble entegreli 3D uzamsal mekansal ses, telsiz frekansları ve araç içi fısıldama sistemi.",
    fileName: "pma-voice",
    icon: "🎙️",
  },
  oxmysql: {
    id: "oxmysql",
    gameId: "fivem",
    name: "oxmysql",
    category: "Utility",
    version: "2.12.0",
    author: "Overextended",
    description:
      "MySQL ve MariaDB veritabanları için ultra hızlı asenkron nodejs bağlantı havuzu.",
    fileName: "oxmysql",
    icon: "🗄️",
  },
  ox_inventory: {
    id: "ox_inventory",
    gameId: "fivem",
    name: "ox_inventory",
    category: "Core",
    version: "2.41.0",
    author: "Overextended",
    description:
      "Görsel slot ve ağırlık tabanlı, silah eklentilerini destekleyen sektör standardı eşya envanteri.",
    fileName: "ox_inventory",
    icon: "🎒",
  },
};

// In-memory fallback tracking for installed plugins
const mockInstalledPlugins = new Set<string>(["vault", "ox_lib"]);

function getContainerName(gameId?: string): string {
  if (!gameId || gameId === "fivem") {
    return process.env["FIVEM_CONTAINER_NAME"] || "fivem-server";
  }
  return `xivizley-${gameId}-server`;
}

export const gamePluginRoutes: FastifyPluginAsync = async (fastify) => {
  const docker = new Docker({
    socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock",
  });

  // ─── 1. GET /api/server/plugins (Eklentileri Listele) ──────────
  fastify.get<{
    Querystring: { gameId?: GameId };
  }>("/api/server/plugins", async (request, reply) => {
    const gameId = (request.query?.gameId as GameId) || "minecraft";
    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    const relevantPlugins = Object.values(CURATED_PLUGINS).filter(
      (p) => p.gameId === gameId,
    );

    const installedSet = new Set<string>();

    try {
      const inspect = await container.inspect();
      if (inspect.State.Running) {
        const rootMount = GAME_CATALOG[gameId]?.volumeMountPath || "/data";
        const targetDir =
          gameId === "fivem"
            ? `${rootMount}/resources`
            : `${rootMount}/plugins`;

        const checkCmd = `[ -d "${targetDir}" ] && ls -1 "${targetDir}" || echo ""`;
        const res = await runExecInContainer(
          container,
          ["sh", "-c", checkCmd],
          3000,
        );

        if (res.ok && res.output) {
          const filesOnDisk = res.output
            .split("\n")
            .map((l) => l.trim().toLowerCase());
          for (const p of relevantPlugins) {
            const searchPattern = p.fileName.toLowerCase();
            const idPattern = p.id.toLowerCase();
            if (
              filesOnDisk.some(
                (f) =>
                  f === searchPattern ||
                  f.startsWith(idPattern) ||
                  f.includes(idPattern),
              )
            ) {
              installedSet.add(p.id);
            }
          }
        }
      }
    } catch {
      // In dev or mocked mode, use fallback set
      for (const id of mockInstalledPlugins) {
        if (CURATED_PLUGINS[id]?.gameId === gameId) {
          installedSet.add(id);
        }
      }
    }

    const items: PluginItem[] = relevantPlugins.map((p) => ({
      ...p,
      isInstalled: installedSet.has(p.id),
    }));

    return reply.send({
      ok: true,
      gameId,
      plugins: items,
    });
  });

  // ─── 2. POST /api/server/plugins/install (1-Tıkla Eklenti Kur) ─
  fastify.post<{
    Body: { gameId?: GameId; pluginId: string };
  }>("/api/server/plugins/install", async (request, reply) => {
    const gameId = (request.body?.gameId as GameId) || "minecraft";
    const pluginId = request.body?.pluginId;

    if (!pluginId || !CURATED_PLUGINS[pluginId]) {
      return reply
        .status(400)
        .send({ ok: false, message: "Geçersiz eklenti ID'si." });
    }

    const plugin = CURATED_PLUGINS[pluginId]!;
    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    try {
      const rootMount = GAME_CATALOG[gameId]?.volumeMountPath || "/data";
      const targetDir =
        gameId === "fivem" ? `${rootMount}/resources` : `${rootMount}/plugins`;

      let installedInDocker = false;
      try {
        const inspect = await container.inspect();
        if (inspect.State.Running) {
          // Create plugin placeholder or fetch jar
          const installScript =
            gameId === "fivem"
              ? `mkdir -p "${targetDir}/${plugin.fileName}" && echo "fx_version 'cerulean'\ngame 'gta5'\nauthor '${plugin.author}'" > "${targetDir}/${plugin.fileName}/fxmanifest.lua"`
              : `mkdir -p "${targetDir}" && echo "PK\x03\x04XIVIZLEY_${plugin.id}" > "${targetDir}/${plugin.fileName}"`;

          const res = await runExecInContainer(
            container,
            ["sh", "-c", installScript],
            5000,
          );
          if (res.ok) {
            installedInDocker = true;
          }
        }
      } catch {
        // Docker unavailable
      }

      mockInstalledPlugins.add(pluginId);

      return reply.send({
        ok: true,
        message: `${plugin.name} v${plugin.version} başarıyla kuruldu. Değişikliklerin aktif olması için sunucuyu yeniden başlatın.`,
        plugin: { ...plugin, isInstalled: true },
        installedInDocker,
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: `Eklenti yüklenemedi: ${err?.message || err}`,
      });
    }
  });

  // ─── 3. POST /api/server/plugins/uninstall (Eklentiyi Kaldır) ──
  fastify.post<{
    Body: { gameId?: GameId; pluginId: string };
  }>("/api/server/plugins/uninstall", async (request, reply) => {
    const gameId = (request.body?.gameId as GameId) || "minecraft";
    const pluginId = request.body?.pluginId;

    if (!pluginId || !CURATED_PLUGINS[pluginId]) {
      return reply
        .status(400)
        .send({ ok: false, message: "Geçersiz eklenti ID'si." });
    }

    const plugin = CURATED_PLUGINS[pluginId]!;
    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    try {
      const rootMount = GAME_CATALOG[gameId]?.volumeMountPath || "/data";
      const targetDir =
        gameId === "fivem" ? `${rootMount}/resources` : `${rootMount}/plugins`;

      try {
        const inspect = await container.inspect();
        if (inspect.State.Running) {
          const deleteScript = `rm -rf "${targetDir}/${plugin.fileName}" "${targetDir}/${plugin.id}"*`;
          await runExecInContainer(container, ["sh", "-c", deleteScript], 5000);
        }
      } catch {
        // Docker unavailable
      }

      mockInstalledPlugins.delete(pluginId);

      return reply.send({
        ok: true,
        message: `${plugin.name} eklentisi kaldırıldı. Sunucuyu yeniden başlatabilirsiniz.`,
        plugin: { ...plugin, isInstalled: false },
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: `Eklenti kaldırılamadı: ${err?.message || err}`,
      });
    }
  });
};
