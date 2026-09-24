// ============================================================
// XIVIZLEY Pulse — Server Checker Engine
// Supports HTTP/HTTPS, TCP Socket (Minecraft, FiveM, SSH) & Ping
// ============================================================

import net from 'node:net';

export interface CheckResult {
  status: 'up' | 'down';
  latencyMs: number;
  statusCode?: number;
  error?: string;
}

/**
 * HTTP / HTTPS servisini kontrol eder.
 */
export async function checkHttp(url: string, timeoutMs = 5000): Promise<CheckResult> {
  const start = performance.now();
  try {
    const targetUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `http://${url}`;

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'XIVIZLEY-Pulse/1.0 (+https://xivizley.com.tr)',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    const latencyMs = Math.round(performance.now() - start);
    const isUp = res.status < 400 || res.status === 401 || res.status === 403; // Auth gerektirse bile sunucu ayaktadır

    return {
      status: isUp ? 'up' : 'down',
      latencyMs,
      statusCode: res.status,
      error: isUp ? undefined : `HTTP Hata Kodu: ${res.status} ${res.statusText}`,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      status: 'down',
      latencyMs: Math.min(latencyMs, timeoutMs),
      error: err?.message || 'Bağlantı zaman aşımına uğradı veya ulaşılamadı',
    };
  }
}

/**
 * TCP Soket portunu kontrol eder (Minecraft 25565, FiveM 30120, SSH 22, vb.)
 */
export async function checkTcp(hostWithPort: string, timeoutMs = 5000): Promise<CheckResult> {
  const start = performance.now();
  let host = hostWithPort;
  let port = 80;

  if (hostWithPort.includes(':')) {
    const parts = hostWithPort.split(':');
    host = parts[0] || 'localhost';
    port = parseInt(parts[1] || '80', 10);
  }

  return new Promise((resolve) => {
    let timer: NodeJS.Timeout;
    const socket = new net.Socket();

    const cleanup = () => {
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.destroy();
    };

    timer = setTimeout(() => {
      cleanup();
      const latencyMs = Math.round(performance.now() - start);
      resolve({
        status: 'down',
        latencyMs: Math.min(latencyMs, timeoutMs),
        error: `TCP Port ${port} yanıt vermedi (Zaman aşımı ${timeoutMs}ms)`,
      });
    }, timeoutMs);

    socket.connect(port, host, () => {
      const latencyMs = Math.round(performance.now() - start);
      cleanup();
      resolve({
        status: 'up',
        latencyMs,
      });
    });

    socket.on('error', (err) => {
      const latencyMs = Math.round(performance.now() - start);
      cleanup();
      resolve({
        status: 'down',
        latencyMs,
        error: `TCP Bağlantı Hatası: ${err.message}`,
      });
    });
  });
}

/**
 * Belirtilen türe göre genel kontrol yürütücü.
 */
export async function runMonitorCheck(
  type: string,
  target: string,
  timeoutMs = 5000
): Promise<CheckResult> {
  const cleanType = (type || 'http').toLowerCase();

  if (cleanType === 'tcp') {
    return checkTcp(target, timeoutMs);
  }

  // Varsayılan HTTP/HTTPS
  return checkHttp(target, timeoutMs);
}
