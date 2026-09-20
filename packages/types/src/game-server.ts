// ─── XIVIZLEY Game Server Tipleri ────────────────────────

/** Desteklenen 9 oyun türü */
export type GameType =
  | "fivem"
  | "minecraft"
  | "cs2"
  | "rust"
  | "palworld"
  | "unturned"
  | "ark"
  | "terraria"
  | "valheim"
  | "custom";

export type GameId =
  | "fivem"
  | "minecraft"
  | "cs2"
  | "rust"
  | "palworld"
  | "unturned"
  | "ark"
  | "terraria"
  | "valheim";

/** Oyun sunucusunun anlık durumu */
export type GameServerStatus =
  | "running"
  | "stopped"
  | "starting"
  | "stopping"
  | "crashed"
  | "unknown";

export type ServerStatus = GameServerStatus;

/** Oyun Motoru Tanımı */
export interface GameEngine {
  id: string;
  name: string;
  overheadMb: number;
  jvmOverheadMb?: number; // Minecraft Java gibi ek JVM bellek payı
  defaultVersion: string;
  versions: string[];
}

/** 1-Tık Mod Paketi Tanımı */
export interface ModPack {
  id: string;
  name: string;
  description: string;
  estimatedRamMb: number;
  icon?: string;
  tags?: string[];
}

/** Eklenti & Script Tanımı */
export interface GamePlugin {
  id: string;
  name: string;
  description: string;
  category: string;
  isRequired?: boolean;
  isOneTimeTask?: boolean; // Chunky gibi tek seferlik başlangıç görevleri
  defaultEnabled?: boolean;
  modrinthSlug?: string; // Modrinth proje slug'ı (itzg otomatik indirme için)
  spigetId?: number;     // SpigotMC resource ID'si (itzg otomatik indirme için)
}

/** 9 Oyun İçin Üst Düzey Katalog Metadatası */
export interface GameMetadata {
  id: GameId;
  name: string;
  tagline: string;
  icon: string;
  badge: string;
  bannerGradient: string;
  minRamMb: number;
  defaultPort: number;
  protocol: "stdin" | "rcon";
  volumeName: string;
  volumeMountPath: string;
  engines: GameEngine[];
  modPacks: ModPack[];
  plugins: GamePlugin[];
  defaultConfig: ActiveServerConfig;
}

/** İstemcide/Zustand Store'da Oyun Başına Saklanan Aktif Konfigürasyon */
export interface ActiveServerConfig {
  engineId: string;
  version: string;
  selectedPackIds: string[];
  enabledPluginIds: string[];
  port: number;
  maxPlayers: number;
  autoRestart: boolean;
  configHash?: string;
  motd?: string;
  onlineMode?: boolean; // false = Korsan (TLauncher vb.) & Orijinal, true = Sadece Orijinal
  difficulty?: "peaceful" | "easy" | "normal" | "hard";
  pvp?: boolean;
  // Diğer Oyunlar İçin Genişletilmiş Özellikler
  serverName?: string;     // Hostname / Sunucu Başlığı
  serverDesc?: string;     // Sunucu Açıklaması / Alt Metin
  serverPassword?: string; // Giriş Şifresi
  adminPassword?: string;  // Yönetici / RCON Şifresi
  map?: string;            // Harita (de_mirage, PEI, TheIsland, Seed vb.)
  gameMode?: string;       // Oyun Modu (5v5 Rekabetçi, Hayatta Kalma vb.)
  tickrate?: number;       // Sunucu Tickrate (64, 128 vb.)
}

/** Tam oyun sunucusu kaydı */
export interface GameServer {
  id: string;
  name: string;
  gameType: GameType;
  status: GameServerStatus;
  /** Docker container ID */
  containerId?: string | undefined;
  /** Ayrılan RAM limiti (MB) */
  ramLimitMb: number;
  /** Ayrılan CPU çekirdek sayısı (kesirli: 1.5 = 1.5 vCPU) */
  cpuCores: number;
  /** Sunucu bağlantı portu */
  port: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Game Panel'in bir sunucuya verdiği start/stop komutu */
export interface GameServerCommand {
  serverId: string;
  action: "start" | "stop" | "restart" | "kill";
  requestedBy: string; // user.id
  requestedAt: Date;
}

