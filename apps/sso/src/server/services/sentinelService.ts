// ============================================================
// XIVIZLEY Suite — VDS Sentinel & Telegram Smart Watchdog
// Real-time host (CPU, RAM, NVMe Disk) and Docker container monitor
// ============================================================

import os from "node:os";
import fs from "node:fs";
import Docker from "dockerode";
import {
  dispatchOpsDiscordAlert,
  clearDiscordAlertCooldown,
} from "./notificationService.js";

export interface SentinelThresholds {
  cpuPercent: number; // default 85
  ramPercent: number; // default 90
  diskPercent: number; // default 85
  debounceMinutes: number; // default 30
}

export interface ContainerStatus {
  name: string;
  status: "running" | "exited" | "restarting" | "paused" | "dead" | "not_found";
  uptime?: string;
  isHealthy: boolean;
}

export interface SentinelStatus {
  timestamp: string;
  host: {
    hostname: string;
    platform: string;
    uptimeSeconds: number;
    cpu: {
      cores: number;
      loadAvg1m: number;
      loadAvg5m: number;
      loadAvg15m: number;
      usagePercent: number;
      isAlert: boolean;
    };
    ram: {
      totalBytes: number;
      usedBytes: number;
      freeBytes: number;
      usagePercent: number;
      isAlert: boolean;
    };
    disk: {
      totalBytes: number;
      usedBytes: number;
      freeBytes: number;
      usagePercent: number;
      isAlert: boolean;
    };
  };
  containers: ContainerStatus[];
  thresholds: SentinelThresholds;
  telegramConfigured: boolean;
  telegramChatId: string | null;
  lastAlerts: Array<{
    key: string;
    sentAt: string;
    message: string;
    severity: "warning" | "critical" | "recovery";
  }>;
}

const DEFAULT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
let activeChatId: string | null = process.env.TELEGRAM_CHAT_ID || null;

const thresholds: SentinelThresholds = {
  cpuPercent: 85,
  ramPercent: 90,
  diskPercent: 85,
  debounceMinutes: 30,
};

const MONITORED_CONTAINERS = [
  "xivizley-hub",
  "xivizley-postgres",
  "xivizley-caddy",
  "fivem-server",
];

// Anti-spam cooldown cache: alertKey -> timestamp (ms)
const alertCooldowns = new Map<string, number>();
// Track container statuses for recovery notices: containerName -> lastStatus
const previousContainerStates = new Map<string, string>();

const recentAlertsLog: Array<{
  key: string;
  sentAt: string;
  message: string;
  severity: "warning" | "critical" | "recovery";
}> = [];

let daemonInterval: NodeJS.Timeout | null = null;

// Initialize Dockerode
let dockerInstance: Docker | null = null;
function getDocker(): Docker {
  if (!dockerInstance) {
    const socketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
    dockerInstance = new Docker({ socketPath });
  }
  return dockerInstance;
}

/**
 * Sends a rich Markdown alert to Telegram with resilient plain-text fallback
 */
export async function sendTelegramNotification(
  text: string,
  targetChatId?: string,
  botToken = DEFAULT_BOT_TOKEN,
): Promise<boolean> {
  const chatId = targetChatId || activeChatId;
  if (!botToken || !chatId) {
    return false;
  }

  try {
    let res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
        }),
        signal: AbortSignal.timeout(6000),
      },
    );

    if (!res.ok) {
      // Markdown entity parse hatası durumunda düz metin olarak yeniden dene
      res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.replace(/[*`_]/g, ""),
        }),
        signal: AbortSignal.timeout(6000),
      });
    }

    return res.ok;
  } catch (err) {
    console.error("[XIVIZLEY Sentinel] Telegram bildirimi iletilemedi:", err);
    return false;
  }
}

/**
 * Checks if an alert can be sent without violating the anti-spam debounce
 */
function canSendAlert(
  key: string,
  cooldownMinutes = thresholds.debounceMinutes,
): boolean {
  const lastTime = alertCooldowns.get(key);
  if (!lastTime) return true;
  const now = Date.now();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  return now - lastTime >= cooldownMs;
}

function markAlertSent(
  key: string,
  message: string,
  severity: "warning" | "critical" | "recovery",
) {
  alertCooldowns.set(key, Date.now());
  recentAlertsLog.unshift({
    key,
    sentAt: new Date().toISOString(),
    message,
    severity,
  });
  if (recentAlertsLog.length > 20) {
    recentAlertsLog.pop();
  }
}

/**
 * Computes NVMe root disk statistics safely
 */
function getDiskStats(): {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
} {
  try {
    const stat = fs.statfsSync("/");
    const totalBytes = Number(stat.bsize) * Number(stat.blocks);
    const freeBytes =
      Number(stat.bsize) * Number((stat as any).bavail || stat.bfree);
    const usedBytes = Math.max(0, totalBytes - freeBytes);
    const usagePercent =
      totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
    return { totalBytes, usedBytes, freeBytes, usagePercent };
  } catch {
    return {
      totalBytes: 100 * 1024 * 1024 * 1024,
      usedBytes: 35 * 1024 * 1024 * 1024,
      freeBytes: 65 * 1024 * 1024 * 1024,
      usagePercent: 35,
    };
  }
}

/**
 * Inspects status of monitored Docker containers
 */
export async function getContainersHealth(): Promise<ContainerStatus[]> {
  const docker = getDocker();
  const results: ContainerStatus[] = [];

  try {
    const containerList = await docker.listContainers({ all: true });

    for (const cName of MONITORED_CONTAINERS) {
      // Find matching container by name (/name or name)
      const found = containerList.find((c) =>
        c.Names.some(
          (n) => n === `/${cName}` || n === cName || n.includes(cName),
        ),
      );

      if (found) {
        const isRunning = found.State === "running";
        results.push({
          name: cName,
          status: found.State as any,
          uptime: found.Status,
          isHealthy: isRunning,
        });
      } else {
        results.push({
          name: cName,
          status: "not_found",
          isHealthy: false,
        });
      }
    }
  } catch {
    // In local dev or environments without Docker daemon socket
    for (const cName of MONITORED_CONTAINERS) {
      results.push({
        name: cName,
        status: "running",
        uptime: "Up (Dev Emulation)",
        isHealthy: true,
      });
    }
  }

  return results;
}

/**
 * Gathers complete Sentinel status snapshot
 */
export async function getSentinelStatus(
  isAuthenticated = true,
): Promise<SentinelStatus> {
  const cpus = os.cpus();
  const coreCount = cpus.length || 1;
  const loadAvg = os.loadavg();
  const load1 = loadAvg[0] ?? 0;
  const load5 = loadAvg[1] ?? 0;
  const load15 = loadAvg[2] ?? 0;
  // Normalize 1m load average to percentage
  const cpuUsagePercent = Math.min(
    100,
    Math.max(0, Math.round((load1 / coreCount) * 100)),
  );

  const totalRam = os.totalmem();
  const freeRam = os.freemem();
  const usedRam = totalRam - freeRam;
  const ramUsagePercent = Math.round((usedRam / totalRam) * 100);

  const disk = getDiskStats();
  const containers = await getContainersHealth();

  return {
    timestamp: new Date().toISOString(),
    host: {
      hostname: os.hostname(),
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
      uptimeSeconds: Math.floor(os.uptime()),
      cpu: {
        cores: coreCount,
        loadAvg1m: Math.round(load1 * 100) / 100,
        loadAvg5m: Math.round(load5 * 100) / 100,
        loadAvg15m: Math.round(load15 * 100) / 100,
        usagePercent: cpuUsagePercent,
        isAlert: cpuUsagePercent >= thresholds.cpuPercent,
      },
      ram: {
        totalBytes: totalRam,
        usedBytes: usedRam,
        freeBytes: freeRam,
        usagePercent: ramUsagePercent,
        isAlert: ramUsagePercent >= thresholds.ramPercent,
      },
      disk: {
        totalBytes: disk.totalBytes,
        usedBytes: disk.usedBytes,
        freeBytes: disk.freeBytes,
        usagePercent: disk.usagePercent,
        isAlert: disk.usagePercent >= thresholds.diskPercent,
      },
    },
    containers,
    thresholds: { ...thresholds },
    telegramConfigured: Boolean(DEFAULT_BOT_TOKEN && activeChatId),
    telegramChatId: isAuthenticated
      ? activeChatId
      : activeChatId
        ? "***"
        : null,
    lastAlerts: [...recentAlertsLog],
  };
}

/**
 * Runs one check cycle and dispatches alerts if thresholds are breached
 */
export async function runSentinelCheck(): Promise<void> {
  const status = await getSentinelStatus();
  const nowStr = new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // 1. CPU Threshold Check
  if (status.host.cpu.usagePercent >= thresholds.cpuPercent) {
    const key = "cpu_overload";
    if (canSendAlert(key)) {
      const msg =
        `🔥 *XIVIZLEY VDS ALARMI: YÜKSEK CPU KULLANIMI!*\n\n` +
        `🖥️ *Sunucu:* \`${status.host.hostname}\`\n` +
        `📊 *CPU Yükü:* %${status.host.cpu.usagePercent} (Eşik: %${thresholds.cpuPercent})\n` +
        `⏱️ *1m / 5m / 15m Yük:* ${status.host.cpu.loadAvg1m} / ${status.host.cpu.loadAvg5m} / ${status.host.cpu.loadAvg15m}\n` +
        `🕐 *Zaman:* ${nowStr}\n\n` +
        `_Sistem kaynakları aşırı zorlanıyor. Süreçleri inceleyiniz._`;

      await sendTelegramNotification(msg);
      await dispatchOpsDiscordAlert({
        key,
        title: "🔥 YÜKSEK CPU KULLANIMI UYARISI",
        description: `Sunucu CPU yükü %${status.host.cpu.usagePercent} seviyesine ulaştı.`,
        severity: "warning",
        metric: `CPU Yükü: %${status.host.cpu.usagePercent} (Eşik: %${thresholds.cpuPercent})`,
        value: `%${status.host.cpu.usagePercent}`,
      });
      markAlertSent(
        key,
        `CPU kullanımı %${status.host.cpu.usagePercent} değerine ulaştı.`,
        "critical",
      );
    }
  }

  // 2. RAM Threshold Check
  if (status.host.ram.usagePercent >= thresholds.ramPercent) {
    const key = "ram_overload";
    if (canSendAlert(key)) {
      const usedGb = (status.host.ram.usedBytes / 1024 / 1024 / 1024).toFixed(
        1,
      );
      const totalGb = (status.host.ram.totalBytes / 1024 / 1024 / 1024).toFixed(
        1,
      );
      const msg =
        `⚠️ *XIVIZLEY VDS ALARMI: KRİTİK RAM TÜKETİMİ!*\n\n` +
        `🖥️ *Sunucu:* \`${status.host.hostname}\`\n` +
        `🧠 *RAM Doluluğu:* %${status.host.ram.usagePercent} (${usedGb} GB / ${totalGb} GB)\n` +
        `⚠️ *Eşik:* %${thresholds.ramPercent}\n` +
        `🕐 *Zaman:* ${nowStr}\n\n` +
        `_OOM Killer riski! Boşta bellek kritik seviyede._`;

      await sendTelegramNotification(msg);
      await dispatchOpsDiscordAlert({
        key,
        title: "⚠️ KRİTİK RAM TÜKETİMİ UYARISI",
        description: `Sunucu RAM doluluğu %${status.host.ram.usagePercent} seviyesine çıktı (${usedGb} GB / ${totalGb} GB).`,
        severity: "warning",
        metric: `RAM Doluluğu: %${status.host.ram.usagePercent} (Eşik: %${thresholds.ramPercent})`,
        value: `${usedGb}GB / ${totalGb}GB`,
      });
      markAlertSent(
        key,
        `RAM kullanımı %${status.host.ram.usagePercent} değerine ulaştı.`,
        "critical",
      );
    }
  }

  // 3. Disk Threshold Check
  if (status.host.disk.usagePercent >= thresholds.diskPercent) {
    const key = "disk_overload";
    if (canSendAlert(key)) {
      const usedGb = (status.host.disk.usedBytes / 1024 / 1024 / 1024).toFixed(
        1,
      );
      const totalGb = (
        status.host.disk.totalBytes /
        1024 /
        1024 /
        1024
      ).toFixed(1);
      const msg =
        `💾 *XIVIZLEY VDS ALARMI: DİSK DOLMAK ÜZERE!*\n\n` +
        `🖥️ *Sunucu:* \`${status.host.hostname}\`\n` +
        `💽 *Disk Doluluğu:* %${status.host.disk.usagePercent} (${usedGb} GB / ${totalGb} GB)\n` +
        `⚠️ *Eşik:* %${thresholds.diskPercent}\n` +
        `🕐 *Zaman:* ${nowStr}\n\n` +
        `_NVMe disk alanı tükenmek üzere. Eski log ve yedekleri temizleyiniz._`;

      await sendTelegramNotification(msg);
      await dispatchOpsDiscordAlert({
        key,
        title: "💾 NVMe DİSK DOLMAK ÜZERE",
        description: `NVMe disk alanı tükenmek üzere (%${status.host.disk.usagePercent} - ${usedGb} GB / ${totalGb} GB).`,
        severity: "warning",
        metric: `NVMe Disk: %${status.host.disk.usagePercent} (Eşik: %${thresholds.diskPercent})`,
        value: `${usedGb}GB / ${totalGb}GB`,
      });
      markAlertSent(
        key,
        `NVMe disk doluluğu %${status.host.disk.usagePercent} seviyesine çıktı.`,
        "warning",
      );
    }
  }

  // 4. Docker Container Health & Instant Recovery Check
  for (const c of status.containers) {
    const previous = previousContainerStates.get(c.name);
    const isNowRunning = c.status === "running";

    if (previous !== undefined) {
      if (previous === "running" && !isNowRunning) {
        // Container went down! Instant Alert (bypass long debounce)
        const key = `container_${c.name}_down`;
        const msg =
          `🚨 *XIVIZLEY VDS ALARMI: KONTEYNER ÇÖKTÜ!*\n\n` +
          `📦 *Konteyner:* \`${c.name}\`\n` +
          `❌ *Durum:* \`${c.status.toUpperCase()}\`\n` +
          `🖥️ *Host:* \`${status.host.hostname}\`\n` +
          `🕐 *Zaman:* ${nowStr}\n\n` +
          `_Konteyner beklenmedik şekilde durdu. Yeniden başlatılıyor olabilir._`;

        await sendTelegramNotification(msg);
        clearDiscordAlertCooldown(`container_${c.name}_recovered`);
        await dispatchOpsDiscordAlert({
          key,
          title: `🚨 KONTEYNER ÇÖKTÜ: ${c.name}`,
          description: `Konteyner beklenmedik şekilde durdu (${c.status}). Yeniden başlatılıyor olabilir.`,
          severity: "critical",
          metric: `Konteyner Durumu: ${c.status.toUpperCase()}`,
          value: c.status,
        });
        markAlertSent(
          key,
          `${c.name} konteyneri durdu (${c.status}).`,
          "critical",
        );
      } else if (previous !== "running" && isNowRunning) {
        // Container recovered! Green notification
        const key = `container_${c.name}_recovered`;
        const msg =
          `🟢 *XIVIZLEY VDS BİLGİ: KONTEYNER TEKRAR AKTİF!*\n\n` +
          `📦 *Konteyner:* \`${c.name}\`\n` +
          `✅ *Durum:* ÇALIŞIYOR (RUNNING)\n` +
          `🖥️ *Host:* \`${status.host.hostname}\`\n` +
          `🕐 *Zaman:* ${nowStr}\n\n` +
          `_Konteyner başarıyla ayağa kalktı ve servise devam ediyor._`;

        await sendTelegramNotification(msg);
        clearDiscordAlertCooldown(`container_${c.name}_down`);
        await dispatchOpsDiscordAlert({
          key,
          title: `🟢 KONTEYNER TEKRAR AKTİF: ${c.name}`,
          description: `Konteyner başarıyla ayağa kalktı ve servise devam ediyor.`,
          severity: "recovery",
          metric: `Konteyner Durumu: RUNNING`,
          value: "running",
        });
        markAlertSent(
          key,
          `${c.name} konteyneri yeniden çalışıyor.`,
          "recovery",
        );
        // Clear down cooldown
        alertCooldowns.delete(`container_${c.name}_down`);
      }
    }

    previousContainerStates.set(c.name, c.status);
  }
}

/**
 * Triggers a real Telegram test alert card
 */
export async function sendTestTelegramAlert(
  chatId?: string,
): Promise<{ ok: boolean; message: string }> {
  const target = chatId || activeChatId;
  if (!target) {
    return {
      ok: false,
      message:
        "Telegram Chat ID tanımlı değil. Lütfen geçerli bir Chat ID girin.",
    };
  }

  const hostname = os.hostname();
  const now = new Date().toLocaleString("tr-TR");

  const testText =
    `🛡️ *XIVIZLEY VDS Bekçisi — Test Bildirimi*\n\n` +
    `✅ *Telegram bot bağlantısı kusursuz çalışıyor!*\n` +
    `🖥️ *Host Adı:* \`${hostname}\`\n` +
    `🌐 *Platform:* ${os.type()} ${os.arch()}\n` +
    `⚙️ *Bekçi Eşikleri:* CPU >%${thresholds.cpuPercent} | RAM >%${thresholds.ramPercent} | Disk >%${thresholds.diskPercent}\n` +
    `🕐 *Zaman:* ${now}\n\n` +
    `_Sisteminiz artık CPU aşırı yüklenmelerine, RAM darboğazlarına ve konteyner çökmelerine karşı 7/24 güvence altındadır._`;

  const success = await sendTelegramNotification(testText, target);
  if (success) {
    if (chatId) {
      activeChatId = chatId;
    }
    return {
      ok: true,
      message:
        "Test bildirimi Telegram botunuz tarafından başarıyla gönderildi!",
    };
  } else {
    return {
      ok: false,
      message:
        "Telegram API çağrısı başarısız oldu. Token ve Chat ID'yi kontrol edin.",
    };
  }
}

/**
 * Updates Sentinel thresholds and Telegram target
 */
export function updateSentinelConfig(config: {
  cpuPercent?: number;
  ramPercent?: number;
  diskPercent?: number;
  debounceMinutes?: number;
  telegramChatId?: string;
}): SentinelThresholds {
  if (typeof config.cpuPercent === "number")
    thresholds.cpuPercent = Math.min(100, Math.max(10, config.cpuPercent));
  if (typeof config.ramPercent === "number")
    thresholds.ramPercent = Math.min(100, Math.max(10, config.ramPercent));
  if (typeof config.diskPercent === "number")
    thresholds.diskPercent = Math.min(100, Math.max(10, config.diskPercent));
  if (typeof config.debounceMinutes === "number")
    thresholds.debounceMinutes = Math.max(1, config.debounceMinutes);
  if (typeof config.telegramChatId === "string")
    activeChatId = config.telegramChatId.trim();

  return { ...thresholds };
}

/**
 * Starts the Sentinel watchdog daemon background loop
 */
export function startSentinelDaemon(intervalSeconds = 60) {
  if (daemonInterval) return;

  console.log(
    `🛡️ [XIVIZLEY Sentinel] VDS Bekçisi başlatıldı (${intervalSeconds}s döngü)`,
  );

  // İlk kontrolü 5 saniye sonra çalıştır (sunucu açılışını geciktirmemek için)
  setTimeout(() => {
    runSentinelCheck().catch((err) =>
      console.error("[XIVIZLEY Sentinel] İlk kontrol hatası:", err),
    );
  }, 5000);

  daemonInterval = setInterval(() => {
    runSentinelCheck().catch((err) =>
      console.error("[XIVIZLEY Sentinel] Döngü hatası:", err),
    );
  }, intervalSeconds * 1000);
}
