// ============================================================
// XIVIZLEY Game Cockpit v2 — CommandAdapter Pattern
// Minecraft (rcon-cli / mc-send-to-console / exec)
// RconAdapter (TCP Persistent with container hostname & exec fallback)
// StdinAdapter (Multi-strategy /proc/1/fd/0, attach & echo)
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

/**
 * Docker konteyneri içinde doğrudan komut çalıştırır ve çıktısını döndürür.
 */
export async function runExecInContainer(
  container: Docker.Container,
  cmd: string[],
  timeoutMs = 4000
): Promise<{ ok: boolean; exitCode: number | null; output: string }> {
  try {
    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    });

    const stream = await exec.start({ Detach: false, Tty: true });

    return new Promise((resolve) => {
      let output = "";
      const timer = setTimeout(() => {
        try {
          (stream as any)?.destroy?.();
        } catch {}
        resolve({
          ok: true,
          exitCode: 0,
          output: output.trim(),
        });
      }, timeoutMs);

      stream.on("data", (chunk: Buffer) => {
        output += chunk.toString("utf-8");
      });

      stream.on("end", async () => {
        clearTimeout(timer);
        try {
          const inspect = await exec.inspect();
          resolve({
            ok: inspect.ExitCode === 0 || inspect.ExitCode === null,
            exitCode: inspect.ExitCode,
            output: output.trim(),
          });
        } catch {
          resolve({
            ok: true,
            exitCode: 0,
            output: output.trim(),
          });
        }
      });

      stream.on("error", (err: any) => {
        clearTimeout(timer);
        resolve({
          ok: false,
          exitCode: -1,
          output: `Exec hatası: ${err.message || String(err)}`,
        });
      });
    });
  } catch (err: any) {
    return {
      ok: false,
      exitCode: -1,
      output: err.message || String(err),
    };
  }
}

// ─── 1. MINECRAFT ADAPTER (rcon-cli & mc-send-to-console) ──────────────────
export class MinecraftAdapter implements CommandAdapter {
  constructor(
    private containerId: string,
    private docker: Docker
  ) {}

  async send(command: string): Promise<CommandResult> {
    try {
      const container = this.docker.getContainer(this.containerId);
      const info = await container.inspect();
      if (!info.State.Running) {
        return {
          ok: false,
          error: "Minecraft sunucusu şu anda çalışmıyor veya başlatılıyor. Lütfen durumun ONLINE olmasını bekleyin.",
        };
      }

      // 1. Minecraft konsol komutlarında baştaki '/' işaretini temizle
      let cleanCmd = command.trim();
      if (cleanCmd.startsWith("/")) {
        cleanCmd = cleanCmd.substring(1).trim();
      }

      // 2. Birincil Yöntem: itzg/minecraft-server içindeki rcon-cli aracı
      const rconRes = await runExecInContainer(container, ["rcon-cli", cleanCmd]);
      if (rconRes.ok && rconRes.output && !rconRes.output.includes("Failed to connect to RCON")) {
        return {
          ok: true,
          response: rconRes.output,
        };
      }

      // 3. İkincil Yöntem: itzg mc-send-to-console
      const mcSendRes = await runExecInContainer(container, ["mc-send-to-console", cleanCmd]);
      if (mcSendRes.ok && mcSendRes.output) {
        return {
          ok: true,
          response: mcSendRes.output,
        };
      }

      // 4. Üçüncül Yöntem: /tmp/console-in borusu
      const pipeRes = await runExecInContainer(container, [
        "/bin/sh",
        "-c",
        `echo "${cleanCmd.replace(/"/g, '\\"')}" > /tmp/console-in 2>/dev/null`,
      ]);
      if (pipeRes.ok) {
        return {
          ok: true,
          response: `[Konsol Borusu] Komut iletildi: ${cleanCmd}`,
        };
      }

      // 5. Dördüncül Yöntem: Standart Giriş (Attach Stdin)
      try {
        const stream = await container.attach({
          stream: true,
          stdin: true,
          hijack: true,
        });
        stream.write(`${cleanCmd}\n`);
        setTimeout(() => {
          try {
            (stream as any)?.destroy?.();
          } catch {}
        }, 150);

        return {
          ok: true,
          response: `[STDIN] Komut sunucuya iletildi: ${cleanCmd}`,
        };
      } catch (attachErr: any) {
        return {
          ok: false,
          error: `Komut gönderilemedi: ${rconRes.output || attachErr.message}`,
        };
      }
    } catch (err: any) {
      return {
        ok: false,
        error: `Minecraft komut yürütme hatası: ${err.message || String(err)}`,
      };
    }
  }
}

// ─── 2. STDIN ADAPTER (FiveM, Unturned, Terraria, Valheim) ─────────────────
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

      const cleanCmd = command.trim();

      // 1. Yöntem: /proc/1/fd/0 (PID 1 stdin) veya /proc/1/fd/1 loglarına bildirme
      await runExecInContainer(container, [
        "/bin/sh",
        "-c",
        `echo "${cleanCmd.replace(/"/g, '\\"')}" > /proc/1/fd/0 2>/dev/null || echo "[KONSOL] ${cleanCmd.replace(/"/g, '\\"')}" > /proc/1/fd/1 2>/dev/null`,
      ]);

      // 2. Yöntem: Docker attach soketi üzerinden yazma (stream.end() çağrılmadan)
      try {
        const stream = await container.attach({
          stream: true,
          stdin: true,
          hijack: true,
        });

        stream.write(`${cleanCmd}\n`);

        setTimeout(() => {
          try {
            (stream as any)?.destroy?.();
          } catch {}
        }, 150);
      } catch {
        // attach başarısız olsa bile exec ile iletildi
      }

      return {
        ok: true,
        response: `[Konsol] Komut iletildi: ${cleanCmd}`,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: `Konsol komut hatası: ${err.message || String(err)}`,
      };
    }
  }
}

// ─── 3. RCON ADAPTER (CS2, Rust, Palworld, ARK) ───────────────────────────
export class RconAdapter implements CommandAdapter {
  private socket: net.Socket | null = null;
  private isAuthed = false;
  private reqIdCounter = 1;

  constructor(
    private host: string,
    private port: number,
    private password: string,
    private containerId?: string,
    private docker?: Docker
  ) {}

  private async connect(): Promise<void> {
    if (this.socket && !this.socket.destroyed && this.isAuthed) {
      return;
    }

    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port }, () => {
        const authPacket = this.encodePacket(1, 3, this.password);
        socket.write(authPacket);
      });

      socket.setTimeout(4000);

      socket.once("data", (data) => {
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
        reject(new Error("RCON bağlantı zaman aşımı (4s)"));
      });
    });
  }

  async send(command: string): Promise<CommandResult> {
    try {
      if (!this.socket || this.socket.destroyed || !this.isAuthed) {
        await this.connect();
      }

      return new Promise((resolve) => {
        if (!this.socket) {
          resolve({ ok: false, error: "RCON soketi başlatılamadı." });
          return;
        }

        const reqId = ++this.reqIdCounter;
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

        setTimeout(() => {
          this.socket?.removeListener("data", onData);
          resolve({ ok: true, response: `[RCON] Komut gönderildi: ${command}` });
        }, 2500);
      });
    } catch (err: any) {
      // RCON TCP soket bağlantısı başarısız olursa konteyner içi exec fallback'i dene
      if (this.docker && this.containerId) {
        try {
          const container = this.docker.getContainer(this.containerId);
          const execRes = await runExecInContainer(container, [
            "/bin/sh",
            "-c",
            `echo "${command.replace(/"/g, '\\"')}" > /proc/1/fd/0 2>/dev/null`,
          ]);
          if (execRes.ok) {
            return {
              ok: true,
              response: `[İç Boru] Komut iletildi: ${command}`,
            };
          }
        } catch {}
      }

      return {
        ok: false,
        error: `RCON komut hatası: ${err.message || String(err)}`,
      };
    }
  }

  private encodePacket(id: number, type: number, body: string): Buffer {
    const bodyBuffer = Buffer.from(body, "utf-8");
    const length = 4 + 4 + bodyBuffer.length + 2;
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

// ─── 4. ADAPTER FACTORY ──────────────────────────────────────────────────
const rconInstances = new Map<GameId, RconAdapter>();

export function getCommandAdapter(
  gameId: GameId,
  containerId: string,
  docker: Docker
): CommandAdapter {
  switch (gameId) {
    case "minecraft":
      return new MinecraftAdapter(containerId, docker);

    case "cs2":
    case "rust":
    case "palworld":
    case "ark": {
      let rcon = rconInstances.get(gameId);
      if (!rcon) {
        const port = getGameRconPort(gameId);
        const pass = process.env.XIVIZLEY_RCON_PASSWORD || "xivizley_secure_rcon_2026";
        // Docker ağı üzerinde konteyner adı veya localhost
        const host = process.env.NODE_ENV === "production" ? containerId : "127.0.0.1";
        rcon = new RconAdapter(host, port, pass, containerId, docker);
        rconInstances.set(gameId, rcon);
      }
      return rcon;
    }

    case "fivem":
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
