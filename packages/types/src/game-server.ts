// ─── XIVIZLEY Game Server Tipleri ────────────────────────

/** Desteklenen oyun türleri */
export type GameType = "fivem" | "minecraft" | "valheim" | "ark" | "custom";

/** Oyun sunucusunun anlık durumu */
export type GameServerStatus =
  | "running"
  | "stopped"
  | "starting"
  | "stopping"
  | "crashed"
  | "unknown";

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
  requestedBy: string;   // user.id
  requestedAt: Date;
}
