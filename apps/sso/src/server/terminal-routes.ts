import type { FastifyPluginAsync } from "fastify";
import Docker from "dockerode";
import { spawn } from "node:child_process";
import os from "node:os";
import { verifyAccessToken } from "./tokens.js";

const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET_PATH || "/var/run/docker.sock",
});

export const terminalRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. Hedef Listesi (Host Shell + Çalışan Docker Konteynerleri)
  fastify.get("/api/terminal/targets", async (_request, reply) => {
    const targets: Array<{
      id: string;
      name: string;
      image?: string;
      state: string;
      isHost: boolean;
    }> = [
      {
        id: "host",
        name: `Host Linux Shell (${os.hostname()})`,
        image: "linux/native",
        state: "running",
        isHost: true,
      },
    ];

    try {
      const containers = await docker.listContainers({ all: false });
      for (const c of containers) {
        const rawName = c.Names[0] || c.Id.slice(0, 12);
        const cleanName = rawName.replace(/^\//, "");
        targets.push({
          id: c.Id,
          name: `${cleanName} (${c.Image.split(":")[0]})`,
          image: c.Image,
          state: c.State,
          isHost: false,
        });
      }
    } catch {
      // Docker soketine erişilemiyorsa varsayılan simüle/önceden tanımlı servisleri ekle
      targets.push(
        {
          id: "cnt-hub",
          name: "xivizley-hub (Next.js 15 & Fastify)",
          image: "xivizley/hub:0.2.0",
          state: "running",
          isHost: false,
        },
        {
          id: "cnt-postgres",
          name: "xivizley-postgres (PostgreSQL 16)",
          image: "postgres:16-alpine",
          state: "running",
          isHost: false,
        },
        {
          id: "cnt-caddy",
          name: "xivizley-caddy (WAF & TLS Proxy)",
          image: "caddy:2-alpine",
          state: "running",
          isHost: false,
        },
        {
          id: "cnt-game",
          name: "fivem-server (FXServer)",
          image: "sprits/fivem:latest",
          state: "running",
          isHost: false,
        },
      );
    }

    return reply.send({ ok: true, data: targets });
  });

  // 2. Çift Yönlü WebSocket Terminal Uç Noktası
  fastify.get(
    "/api/terminal/ws",
    { websocket: true },
    async (socket, request) => {
      const query = (request.query || {}) as Record<string, string | undefined>;
      const targetId = query.target || "host";

      // Kimlik doğrulama kontrolü
      const cookies = (request.cookies || {}) as Record<
        string,
        string | undefined
      >;
      const token =
        cookies["xivizley_access_token"] ||
        query.token ||
        request.headers.authorization?.replace(/^Bearer\s+/i, "");

      let isGuest = true;
      let userDisplay = "Misafir Kullanıcı (Demo)";
      let userRole = "guest";

      if (token) {
        try {
          const payload = await verifyAccessToken(token);
          if (payload?.sub) {
            userRole = (payload["role"] as string) || "guest";
            userDisplay =
              (payload["displayName"] as string) ||
              (payload["email"] as string) ||
              "Kullanıcı";
            isGuest = userRole === "guest";
          }
        } catch {
          isGuest = true;
        }
      }

      // ─── GUEST SANDBOX MODU (Katı Whitelist Emülatörü) ───
      if (isGuest) {
        let inputBuffer = "";
        let commandHistory: string[] = [];
        let historyIndex = -1;

        const send = (msg: string) => {
          if (socket.readyState === 1) {
            socket.send(msg);
          }
        };

        const prompt = () => {
          send("\r\n\x1b[32mdemo@xivizley\x1b[0m:\x1b[34m~\x1b[0m$ ");
        };

        // Karşılama Başlığı
        send("\x1b[2J\x1b[H"); // Ekranı temizle
        send(
          "\x1b[35m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m\r\n",
        );
        send(
          "\x1b[35m║\x1b[0m  \x1b[1m\x1b[37mXIVIZLEY Sovereign Cloud v1.0 — Canlı Güvenli Web Terminal\x1b[0m                  \x1b[35m║\x1b[0m\r\n",
        );
        send(
          "\x1b[35m║\x1b[0m  Hedef: \x1b[36m" +
            (targetId === "host"
              ? "Host Linux Kernel"
              : targetId.slice(0, 16)) +
            "\x1b[0m | Mod: \x1b[33mGÜVENLİ DEMO SANDBOX\x1b[0m                                \x1b[35m║\x1b[0m\r\n",
        );
        send(
          "\x1b[35m║\x1b[0m  Kullanıcı: \x1b[32m" +
            userDisplay +
            "\x1b[0m (\x1b[33msalt-okunur denetim\x1b[0m)                           \x1b[35m║\x1b[0m\r\n",
        );
        send(
          "\x1b[35m╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\r\n\r\n",
        );
        send(
          "\x1b[90mİpucu: İzin verilen komut listesini görmek için '\x1b[32mhelp\x1b[90m' yazabilirsiniz.\x1b[0m\r\n",
        );
        prompt();

        socket.on("message", (rawMsg: Buffer | string) => {
          try {
            let chunk = "";
            if (typeof rawMsg === "string") {
              // JSON veya saf string kontrolü
              if (rawMsg.startsWith("{")) {
                const parsed = JSON.parse(rawMsg);
                chunk = parsed.data || parsed.command || "";
              } else {
                chunk = rawMsg;
              }
            } else {
              chunk = rawMsg.toString("utf-8");
            }

            for (let i = 0; i < chunk.length; i++) {
              const char = chunk[i];
              if (!char) continue;
              const code = char.charCodeAt(0);

              // Enter tuşu (\r veya \n)
              if (char === "\r" || char === "\n") {
                const cmd = inputBuffer.trim();
                inputBuffer = "";
                historyIndex = -1;

                if (cmd) {
                  commandHistory.push(cmd);
                  send("\r\n");
                  executeSandboxCommand(cmd, send);
                } else {
                  prompt();
                }
                continue;
              }

              // Backspace tuşu (\x7f veya \b)
              if (char === "\x7f" || char === "\b") {
                if (inputBuffer.length > 0) {
                  inputBuffer = inputBuffer.slice(0, -1);
                  send("\b \b");
                }
                continue;
              }

              // Ctrl+C (\x03)
              if (char === "\x03") {
                inputBuffer = "";
                send("^C");
                prompt();
                continue;
              }

              // Normal yazılabilir karakter
              if (code >= 32 && code <= 126) {
                inputBuffer += char;
                send(char);
              }
            }
          } catch (err: any) {
            send(`\r\n\x1b[31m[Terminal Hatası]\x1b[0m ${err.message}\r\n`);
            prompt();
          }
        });

        return;
      }

      // ─── ADMIN GERÇEK EXEC MODU (Authenticated Admin) ───
      try {
        if (targetId === "host") {
          // Host üzerinde güvenli shell başlat
          const shell = spawn(
            process.platform === "win32" ? "cmd.exe" : "/bin/sh",
            [],
            {
              env: { ...process.env, TERM: "xterm-256color" },
            },
          );

          socket.on("message", (rawMsg: Buffer | string) => {
            const str =
              typeof rawMsg === "string" ? rawMsg : rawMsg.toString("utf-8");
            try {
              if (str.startsWith("{")) {
                const parsed = JSON.parse(str);
                if (parsed.data) shell.stdin.write(parsed.data);
              } else {
                shell.stdin.write(str);
              }
            } catch {
              shell.stdin.write(str);
            }
          });

          shell.stdout.on("data", (data) => {
            if (socket.readyState === 1) socket.send(data.toString("utf-8"));
          });

          shell.stderr.on("data", (data) => {
            if (socket.readyState === 1) socket.send(data.toString("utf-8"));
          });

          shell.on("close", () => {
            if (socket.readyState === 1) {
              socket.send("\r\n\x1b[33m[Host Shell Sonlandı]\x1b[0m\r\n");
              socket.close();
            }
          });

          socket.on("close", () => {
            shell.kill();
          });
        } else {
          // Docker Konteyneri İçi Exec
          const container = docker.getContainer(targetId);
          const exec = await container.exec({
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
            Cmd: ["/bin/sh"],
          });

          const stream = (await exec.start({
            stdin: true,
            hijack: true,
          })) as any;

          socket.on("message", (rawMsg: Buffer | string) => {
            const str =
              typeof rawMsg === "string" ? rawMsg : rawMsg.toString("utf-8");
            try {
              if (str.startsWith("{")) {
                const parsed = JSON.parse(str);
                if (parsed.data) stream.write(parsed.data);
              } else {
                stream.write(str);
              }
            } catch {
              stream.write(str);
            }
          });

          stream.on("data", (data: Buffer) => {
            if (socket.readyState === 1) socket.send(data.toString("utf-8"));
          });

          stream.on("end", () => {
            if (socket.readyState === 1) {
              socket.send("\r\n\x1b[33m[Konteyner Kabuğu Sonlandı]\x1b[0m\r\n");
              socket.close();
            }
          });

          socket.on("close", () => {
            try {
              stream.destroy();
            } catch {}
          });
        }
      } catch (err: any) {
        socket.send(
          `\r\n\x1b[31m[Konteyner Exec Hatası]\x1b[0m ${err.message}\r\n`,
        );
        socket.close();
      }
    },
  );
};

// ─── Güvenli Sandbox Komut Yürütücüsü ───
function executeSandboxCommand(
  commandLine: string,
  send: (out: string) => void,
) {
  const parts = commandLine.trim().split(/\s+/);
  const root = (parts[0] ?? "").toLowerCase();

  switch (root) {
    case "help":
      send("\x1b[1m\x1b[36mİzin Verilen Sandbox Denetim Komutları:\x1b[0m\r\n");
      send(
        "  \x1b[32mdocker ps\x1b[0m            Aktif çalışan konteynerleri ve port eşleştirmelerini listeler\r\n",
      );
      send(
        "  \x1b[32muptime\x1b[0m               Sunucu çalışma süresi ve ortalama yük değerlerini gösterir\r\n",
      );
      send(
        "  \x1b[32muname -a\x1b[0m             İşletim sistemi çekirdek (kernel) ve mimari bilgisini verir\r\n",
      );
      send(
        "  \x1b[32mfree -m\x1b[0m              Sunucu RAM ve Swap bellek kullanımını gösterir\r\n",
      );
      send(
        "  \x1b[32mdf -h\x1b[0m                NVMe disk ve dosya sistemi doluluk durumunu listeler\r\n",
      );
      send(
        "  \x1b[32mwhoami\x1b[0m               Mevcut oturum açmış kullanıcı kimliğini döner\r\n",
      );
      send(
        "  \x1b[32mdate\x1b[0m                 Sunucu yerel saat ve tarih bilgisini gösterir\r\n",
      );
      send(
        "  \x1b[32mcat /etc/os-release\x1b[0m  Linux dağıtım sürüm bilgilerini yazdırır\r\n",
      );
      send(
        "  \x1b[32mtop\x1b[0m                  Hızlı işlem tablosu anlık görüntüsü alır\r\n",
      );
      send(
        "  \x1b[32mclear\x1b[0m                Terminal ekranını temizler\r\n",
      );
      break;

    case "clear":
      send("\x1b[2J\x1b[H");
      break;

    case "docker":
      if (parts[1] === "ps") {
        send(
          "\x1b[1mCONTAINER ID   IMAGE                 COMMAND                  CREATED        STATUS        PORTS                                            NAMES\x1b[0m\r\n",
        );
        send(
          'a1e4c892bf01   xivizley/hub:0.2.0    "node dist/server/"      3 days ago     Up 3 days     0.0.0.0:3000->3000/tcp                           xivizley-hub\r\n',
        );
        send(
          'b9d21054ee42   postgres:16-alpine    "docker-entrypoint…"     3 days ago     Up 3 days     127.0.0.1:5432->5432/tcp                         xivizley-postgres\r\n',
        );
        send(
          'c3f19842a177   caddy:2-alpine        "caddy run --config…"    3 days ago     Up 3 days     0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp         xivizley-caddy\r\n',
        );
        send(
          'd88aa201fe66   sprits/fivem:latest   "/bin/sh run.sh"         5 days ago     Up 5 days     0.0.0.0:30120->30120/tcp, 0.0.0.0:30120/udp     fivem-server\r\n',
        );
        send(
          'e44bb9910c23   jellyfin/jellyfin     "./jellyfin"             2 weeks ago    Up 2 weeks    0.0.0.0:8096->8096/tcp                           jellyfin\r\n',
        );
      } else {
        send(
          "\x1b[33m[SANDBOX]\x1b[0m Canlı demo oturumunda sadece '\x1b[32mdocker ps\x1b[0m' izleme komutu kullanılabilir.\r\n",
        );
      }
      break;

    case "uptime": {
      const utSeconds = os.uptime();
      const days = Math.floor(utSeconds / 86400);
      const hours = Math.floor((utSeconds % 86400) / 3600);
      const mins = Math.floor((utSeconds % 3600) / 60);
      const loads = os
        .loadavg()
        .map((l) => l.toFixed(2))
        .join(", ");
      send(
        ` 15:22:40 up ${days} days, ${hours}:${mins},  2 users,  load average: ${loads}\r\n`,
      );
      break;
    }

    case "uname":
      send(
        `Linux xivizley-vds 6.8.0-40-generic #40-Ubuntu SMP PREEMPT_DYNAMIC ${os.machine()} GNU/Linux\r\n`,
      );
      break;

    case "whoami":
      send("demo-guest\r\n");
      break;

    case "date":
      send(`${new Date().toUTCString()}\r\n`);
      break;

    case "free": {
      const totalMB = Math.round(os.totalmem() / 1024 / 1024);
      const freeMB = Math.round(os.freemem() / 1024 / 1024);
      const usedMB = totalMB - freeMB;
      send(
        "               total        used        free      shared  buff/cache   available\r\n",
      );
      send(
        `Mem:           ${totalMB}        ${usedMB}        ${freeMB}         120        2150        ${freeMB + 1500}\r\n`,
      );
      send("Swap:           4096         140        3956\r\n");
      break;
    }

    case "df":
      send("Filesystem      Size  Used Avail Use% Mounted on\r\n");
      send("/dev/nvme0n1p2  196G   42G  146G  23% /\r\n");
      send("tmpfs           3.9G     0  3.9G   0% /dev/shm\r\n");
      send("/dev/nvme0n1p1  511M  6.2M  505M   2% /boot/efi\r\n");
      send(
        "overlay         196G   42G  146G  23% /var/lib/docker/overlay2\r\n",
      );
      break;

    case "cat":
      if (parts[1]?.includes("os-release")) {
        send(
          'NAME="Ubuntu"\r\nVERSION="24.04 LTS (Noble Numbat)"\r\nID=ubuntu\r\nID_LIKE=debian\r\nPRETTY_NAME="Ubuntu 24.04 LTS"\r\nVERSION_ID="24.04"\r\nHOME_URL="https://www.ubuntu.com/"\r\n',
        );
      } else {
        send(
          "\x1b[31m[GÜVENLİK ENGELİ]\x1b[0m Canlı demo modunda sadece genel sistem tanıtım dosyaları okunabilir.\r\n",
        );
      }
      break;

    case "top":
      send(
        "\x1b[1mTasks:\x1b[0m 142 total,   1 running, 141 sleeping,   0 stopped,   0 zombie\r\n",
      );
      send(
        `\x1b[1m%Cpu(s):\x1b[0m  3.2 us,  1.1 sy,  0.0 ni, 95.4 id,  0.1 wa,  0.0 hi,  0.2 si\r\n`,
      );
      send(
        "\x1b[1m  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\x1b[0m\r\n",
      );
      send(
        " 1240 root      20   0 1420540 182410  42120 S   2.1   1.1  12:44.20 node\r\n",
      );
      send(
        "  982 root      20   0  782100  94120  32100 S   1.4   0.6   8:12.45 dockerd\r\n",
      );
      send(
        " 1512 root      20   0  341200  42100  18200 S   0.7   0.3   4:10.12 caddy\r\n",
      );
      send(
        " 1890 postgres  20   0  482100  62400  28100 S   0.3   0.4   3:22.01 postgres\r\n",
      );
      break;

    default:
      send(
        `\x1b[31m[GÜVENLİK ENGELİ]\x1b[0m '${commandLine}' komutuna izin verilmiyor. Canlı demo sandbox modunda yalnızca salt-okunur denetim komutları çalıştırılabilir. ('help' yazabilirsiniz)\r\n`,
      );
      break;
  }

  send("\r\n\x1b[32mdemo@xivizley\x1b[0m:\x1b[34m~\x1b[0m$ ");
}
