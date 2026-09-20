// ============================================================
// XIVIZLEY Game Cockpit v2 — CommandAdapter Pattern
// StdinAdapter (Docker attach stdin) & RconAdapter (TCP Persistent)
// Claude Mimarisi: /proc/1/fd/0 yerine container.attach, RCON auto-reconnect
// ============================================================

import Docker from "dockerode";
import net from "net";
import type { GameId } from "@xivizley/types";

export interface CommandResult {
  ok: boolean;
  response?: string;
  error?: string;
}

export interface CommandAdapter {
  send(command: string): Promise<CommandResult>;
}

// ─── 1. STDIN ADAPTER (FiveM, Minecraft, Unturned, Terraria, Valheim) ─────
export class StdinAdapter implements CommandAdapter {
  constructor(
    private containerId: string,
    private docker: Docker
  ) {}

  async send(command: string): Promise<CommandResult> {
    try {
      const container = this.docker.getContainer(this.containerId);
      const info = await container.inspect();
      if (!info.State.Running) {
        return { ok: false, error: "Sunucu konteyneri şu anda çalışmıyor." };
      }

      // Claude Tavsiyesi: /proc/1/fd/0 yerine Dockerode attach soketi kullanımı
      const stream = await container.attach({
        stream: true,
        stdin: true,
        hijack: true,
      });

      // Komutu stdin akışına yaz ve yeni satır gönder
      const payload = command.endsWith("\n") ? command : `${command}\n`;
      stream.write(payload);

      // Akışı kapat
      if (typeof stream.end === "function") {
        stream.end();
      }

      return {
        ok: true,
        response: `[STDIN] Komut iletildi: ${command}`,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: `STDIN komut hatası: ${err.message || String(err)}`,
      };
    }
  }
}

// ─── 2. RCON ADAPTER (CS2, Rust, Palworld, ARK) ─────────────────────────
// Source RCON Protokolü (RFC standardı / Valve & Unreal Engine)
export class RconAdapter implements CommandAdapter {
  private socket: net.Socket | null = null;
  private isAuthed = false;
  private reqIdCounter = 1;

  constructor(
    private host: string,
    private port: number,
    private password: string
  ) {}

  private async connect(): Promise<void> {
    if (this.socket && !this.socket.destroyed && this.isAuthed) {
      return;
    }

    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port }, () => {
        // Auth paketi gönder: Type 3 = SERVERDATA_AUTH
        const authPacket = this.encodePacket(1, 3, this.password);
        socket.write(authPacket);
      });

      socket.setTimeout(5000);

      socket.once("data", (data) => {
        // Auth yanıtını ayrıştır: Type 2 = SERVERDATA_AUTH_RESPONSE
        const res = this.decodePacket(data);
        if (res && res.id !== -1) {
          this.isAuthed = true;
          this.socket = socket;
          resolve();
        } else {
          socket.destroy();
          reject(new Error("RCON yetkilendirme hatası: Hatalı şifre"));
        }
      });

      socket.once("error", (err) => {
        this.isAuthed = false;
        reject(err);
      });

      socket.once("close", () => {
        this.isAuthed = false;
        this.socket = null;
      });

      socket.once("timeout", () => {
        socket.destroy();
        this.isAuthed = false;
        reject(new Error("RCON bağlantı zaman aşımı (5s)"));
      });
    });
  }

  async send(command: string): Promise<CommandResult> {
    try {
      // Claude Tavsiyesi: Bağlantı kopmuşsa veya ilk istekte otomatik reconnect
      if (!this.socket || this.socket.destroyed || !this.isAuthed) {
        await this.connect();
      }

      return new Promise((resolve) => {
        if (!this.socket) {
          resolve({ ok: false, error: "RCON soketi başlatılamadı." });
          return;
        }

        const reqId = ++this.reqIdCounter;
        // Type 2 = SERVERDATA_EXECCOMMAND
        const packet = this.encodePacket(reqId, 2, command);

        const onData = (data: Buffer) => {
          const res = this.decodePacket(data);
          this.socket?.removeListener("data", onData);
          resolve({
            ok: true,
            response: res?.body || `[RCON] Komut yürütüldü: ${command}`,
          });
        };

        this.socket.once("data", onData);
        this.socket.write(packet);

        // 3 saniye yanıt gelmezse timeout
        setTimeout(() => {
          this.socket?.removeListener("data", onData);
          resolve({ ok: true, response: `[RCON] Komut gönderildi (yanıt beklemedi)` });
        }, 3000);
      });
    } catch (err: any) {
      return {
        ok: false,
        error: `RCON komut hatası: ${err.message || String(err)}`,
      };
    }
  }

  private encodePacket(id: number, type: number, body: string): Buffer {
    const bodyBuffer = Buffer.from(body, "utf-8");
    const length = 4 + 4 + bodyBuffer.length + 2; // id(4) + type(4) + body + 2 null bytes
    const buffer = Buffer.alloc(4 + length);

    buffer.writeInt32LE(length, 0);
    buffer.writeInt32LE(id, 4);
    buffer.writeInt32LE(type, 8);
    bodyBuffer.copy(buffer, 12);
    buffer.writeInt8(0, 12 + bodyBuffer.length);
    buffer.writeInt8(0, 13 + bodyBuffer.length);

    return buffer;
  }

  private decodePacket(data: Buffer): { length: number; id: number; type: number; body: string } | null {
    if (data.length < 12) return null;
    const length = data.readInt32LE(0);
    const id = data.readInt32LE(4);
    const type = data.readInt32LE(8);
    const body = data.subarray(12, data.length - 2).toString("utf-8");
    return { length, id, type, body };
  }
}

// ─── 3. ADAPTER FACTORY ──────────────────────────────────────────────────
const rconInstances = new Map<GameId, RconAdapter>();

export function getCommandAdapter(
  gameId: GameId,
  containerId: string,
  docker: Docker
): CommandAdapter {
  switch (gameId) {
    case "cs2":
    case "rust":
    case "palworld":
    case "ark": {
      let rcon = rconInstances.get(gameId);
      if (!rcon) {
        const port = getGameRconPort(gameId);
        const pass = process.env.XIVIZLEY_RCON_PASSWORD || "xivizley_secure_rcon_2026";
        rcon = new RconAdapter("127.0.0.1", port, pass);
        rconInstances.set(gameId, rcon);
      }
      return rcon;
    }
    case "fivem":
    case "minecraft":
    case "unturned":
    case "terraria":
    case "valheim":
    default:
      return new StdinAdapter(containerId, docker);
  }
}

function getGameRconPort(gameId: GameId): number {
  switch (gameId) {
    case "cs2":
      return 27015;
    case "rust":
      return 28016;
    case "palworld":
      return 25575;
    case "ark":
      return 27020;
    default:
      return 25575;
  }
}
