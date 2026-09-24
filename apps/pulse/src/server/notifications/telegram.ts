// ============================================================
// XIVIZLEY Pulse — Notification Dispatcher (Telegram & Webhook)
// ============================================================

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
 * Telegram üzerinden anlık durum alarmı gönderir.
 */
export async function sendTelegramAlert(
  payload: AlertPayload,
  botToken = DEFAULT_BOT_TOKEN,
  chatId = DEFAULT_CHAT_ID
): Promise<boolean> {
  if (!botToken || !chatId) {
    // Chat ID henüz yapılandırılmamışsa sessizce geç
    return false;
  }

  const isDown = payload.status === 'down';
  const emoji = isDown ? '🚨' : '🟢';
  const title = isDown ? 'DİKKAT: SERVİS ÇÖKTÜ!' : 'BİLGİ: SERVİS DÜZELDİ';

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
