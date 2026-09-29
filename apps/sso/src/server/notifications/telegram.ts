// ============================================================
// XIVIZLEY Pulse — Notification Dispatcher (Telegram & Webhook)
// ============================================================

import { sendDiscordAlert } from "./discord";

export interface AlertPayload {
  monitorName: string;
  target: string;
  status: 'up' | 'down';
  latencyMs?: number;
  errorMessage?: string;
}

const DEFAULT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8642076722:AAFUZfYPMixrLKAMVrbHRORh4hNqrEi3ksA';
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Telegram ve Discord üzerinden anlık durum alarmı gönderir.
 */
export async function sendTelegramAlert(
  payload: AlertPayload,
  botToken = DEFAULT_BOT_TOKEN,
  chatId = DEFAULT_CHAT_ID
): Promise<boolean> {
  const isDown = payload.status === 'down';
  const emoji = isDown ? '🚨' : '🟢';
  const title = isDown ? 'DİKKAT: SERVİS ÇÖKTÜ!' : 'BİLGİ: SERVİS DÜZELDİ';

  // Discord Webhook bildirimi gönder
  sendDiscordAlert({
    title: `${emoji} ${title} — ${payload.monitorName}`,
    description: isDown
      ? `**Hedef:** \`${payload.target}\`\n**Hata:** ${payload.errorMessage || 'Yanıt alınamadı'}`
      : `**Hedef:** \`${payload.target}\`\n**Gecikme:** ${payload.latencyMs} ms`,
    color: isDown ? 0xe11d48 : 0x10b981,
    fields: [
      { name: "Servis", value: payload.monitorName, inline: true },
      { name: "Durum", value: isDown ? "❌ DOWN" : "✅ UP", inline: true },
      { name: "Zaman", value: new Date().toLocaleTimeString("tr-TR"), inline: true },
    ],
  }).catch(() => {});

  if (!botToken || !chatId) {
    // Telegram Chat ID henüz yapılandırılmamışsa sessizce geç
    return false;
  }

  const text = isDown
    ? `${emoji} *${title}*\n\n` +
      `*Servis:* ${payload.monitorName}\n` +
      `*Hedef:* \`${payload.target}\`\n` +
      `*Durum:* ❌ DOWN (Ulaşılamıyor)\n` +
      `*Hata:* ${payload.errorMessage || 'Yanıt alınamadı'}\n` +
      `*Zaman:* ${new Date().toLocaleTimeString('tr-TR')}`
    : `${emoji} *${title}*\n\n` +
      `*Servis:* ${payload.monitorName}\n` +
      `*Hedef:* \`${payload.target}\`\n` +
      `*Durum:* ✅ UP (Aktif)\n` +
      `*Gecikme:* ${payload.latencyMs} ms\n` +
      `*Zaman:* ${new Date().toLocaleTimeString('tr-TR')}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
      signal: AbortSignal.timeout(5000),
    });

    return res.ok;
  } catch (err) {
    console.error('[XIVIZLEY Pulse] Telegram bildirimi gönderilemedi:', err);
    return false;
  }
}
