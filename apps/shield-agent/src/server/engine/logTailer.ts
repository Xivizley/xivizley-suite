// ============================================================
// XIVIZLEY Shield — Real-time Caddy Access Log Tailer & Analyzer
// Watches Caddy JSON access logs and triggers WAF threat mitigation
// ============================================================

import fs from "node:fs";
import readline from "node:readline";
import path from "node:path";
import { inspectPayload } from "./heuristicWaf";
import { resolveGeoIp } from "./geoIpResolver";
import { banIp, recordSecurityEvent } from "../services/shieldService";
import { sendShieldTelegramAlert } from "../notifications/telegramAlerter";

const LOG_FILE_PATHS = [
  process.env["CADDY_LOG_PATH"] || "/var/log/caddy/access.log",
  path.resolve(process.cwd(), ".storage/caddy-access.log"),
];

let isTailerRunning = false;
let fileWatcher: fs.FSWatcher | null = null;
let currentFilePosition = 0;

interface CaddyAccessLogLine {
  ts?: number;
  request?: {
    remote_ip?: string;
    client_ip?: string;
    method?: string;
    uri?: string;
    host?: string;
    headers?: Record<string, string[]>;
  };
  status?: number;
  size?: number;
  duration?: number;
}

/**
 * Bir satır Caddy JSON logunu analiz eder ve gerekirse WAF kalkanını devreye sokar.
 */
export async function processLogLine(line: string) {
  if (!line || !line.trim()) return;

  try {
    const entry: CaddyAccessLogLine = JSON.parse(line.trim());
    const req = entry.request;
    if (!req) return;

    const ip = req.client_ip || req.remote_ip || "";
    const uri = req.uri || "";
    const method = req.method || "GET";
    const host = req.host || "xivizley.com.tr";
    const status = entry.status || 200;

    // Yerel veya güvenli IP'leri atla
    if (
      !ip ||
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("10.") ||
      ip.startsWith("192.168.")
    ) {
      return;
    }

    // 1. Heuristic WAF ile URL ve parametre incelemesi
    const wafResult = inspectPayload(uri);

    // 2. 404/403 tarayıcı bot tespiti
    const isSuspiciousScanner =
      (status === 404 || status === 403) &&
      (uri.includes(".env") ||
        uri.includes("wp-") ||
        uri.includes("phpmyadmin") ||
        uri.includes(".git") ||
        uri.includes("setup.cgi") ||
        uri.includes("actuator"));

    if (wafResult.isThreat || isSuspiciousScanner) {
      const threatType = wafResult.threatType || "MALICIOUS_SCANNER";
      const severity = wafResult.severity || "high";
      const geo = resolveGeoIp(ip);

      console.warn(
        `🚨 [SHIELD RADAR] Tehdit yakalandı: ${ip} (${geo.countryCode}) -> ${method} ${uri} [${threatType}]`,
      );

      // Olayı kaydet
      await recordSecurityEvent({
        sourceIp: ip,
        targetService: host,
        targetPort: 443,
        requestMethod: method,
        requestPath: uri,
        threatType,
        severity,
        actionTaken: "blocked",
        payloadPreview: uri.slice(0, 150),
      });

      // Kritik veya Yüksek seviye ise IP'yi otomatik karantinaya al
      if (severity === "critical" || severity === "high") {
        await banIp(
          ip,
          `Caddy WAF Bot Kalkanı: ${threatType} (${uri.slice(0, 40)})`,
          severity,
          false,
        );

        // Telegram bildirimi gönder
        await sendShieldTelegramAlert(
          ip,
          geo.countryName,
          geo.countryCode,
          threatType,
          `${method} ${uri}`,
          "IP Otomatik 24 Saat Karantinaya Alındı",
        ).catch(() => {});
      }
    }
  } catch (err) {
    // Geçersiz JSON veya parse hatasını sessizce geç
  }
}

/**
 * Caddy erişim log dosyasını izlemeye başlar (Streaming Tail).
 */
export function startLogTailer(): boolean {
  if (isTailerRunning) return true;

  // Mevcut log dosyasını bul
  let targetPath = LOG_FILE_PATHS.find((p) => fs.existsSync(p));

  if (!targetPath) {
    // Yoksa test/örnek dizinini oluştur
    const defaultPath = LOG_FILE_PATHS[0];
    const dir = path.dirname(defaultPath);
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(defaultPath, "", "utf-8");
      targetPath = defaultPath;
    } catch {
      targetPath = LOG_FILE_PATHS[1];
      const localDir = path.dirname(targetPath);
      if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
      fs.writeFileSync(targetPath, "", "utf-8");
    }
  }

  try {
    const stats = fs.statSync(targetPath);
    currentFilePosition = stats.size; // Dosyanın sonundan başla (eski logları tekrar okumamak için)

    fileWatcher = fs.watch(targetPath, (eventType) => {
      if (eventType === "change") {
        readNewLines(targetPath!);
      }
    });

    isTailerRunning = true;
    console.log(`🛡️ [SHIELD] Caddy Log Dinleyici aktif edildi: ${targetPath}`);
    return true;
  } catch (err) {
    console.error("Shield Log Dinleyici başlatılamadı:", err);
    return false;
  }
}

function readNewLines(filePath: string) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size < currentFilePosition) {
      // Dosya logrotate edilmiş, başa sar
      currentFilePosition = 0;
    }

    if (stats.size > currentFilePosition) {
      const stream = fs.createReadStream(filePath, {
        start: currentFilePosition,
        end: stats.size,
        encoding: "utf-8",
      });

      const rl = readline.createInterface({ input: stream });

      rl.on("line", (line) => {
        processLogLine(line).catch(() => {});
      });

      currentFilePosition = stats.size;
    }
  } catch (err) {
    // read error
  }
}
