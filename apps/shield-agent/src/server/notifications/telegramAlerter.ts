// ============================================================
// XIVIZLEY Shield — Telegram Incident Alerter
// Real-time security incident alerts via @xivizley_destek_bot
// ============================================================

const DEFAULT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8642076722:AAFUZfYPMixrLKAMVrbHRORh4hNqrEi3ksA';
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export interface ThreatAlertPayload {
  ip: string;
  countryName: string;
  flag: string;
  threatType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  targetService: string;
  reason: string;
  isBanned: boolean;
}

export async function sendShieldTelegramAlert(payload: ThreatAlertPayload): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;

  if (!token || !chatId) {
    // Chat ID tanımlı değilse sessizce logla
    console.log(`[Shield WAF Alert] ${payload.flag} ${payload.ip} -> ${payload.threatType} (${payload.severity.toUpperCase()})`);
    return false;
  }

  const severityIcon = payload.severity === 'critical' ? '🔴 KRİTİK' : payload.severity === 'high' ? '🟠 YÜKSEK' : '🟡 ORTA';
  const banStatus = payload.isBanned ? '🚫 IP Otomatik Olarak Karantinaya Alındı (Ban)' : '⚠️ İstek Engellendi';

  const message = [
    `🛡️ *XIVIZLEY SHIELD — SİBER GÜVENLİK ALARMI*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📡 *Tehdit Seviyesi:* ${severityIcon}`,
    `🌍 *Saldırgan IP:* \`${payload.ip}\` (${payload.flag} ${payload.countryName})`,
    `🎯 *Hedef Servis:* *${payload.targetService}*`,
    `⚔️ *Saldırı Türü:* \`${payload.threatType}\``,
    `📝 *Açıklama:* ${payload.reason}`,
    `🔒 *Sonuç:* ${banStatus}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🕒 _${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} — VDS Edge Firewall_`,
  ].join('\n');

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
      signal: AbortSignal.timeout(5000),
    });

    return res.ok;
  } catch (err: any) {
    console.error('[Shield Telegram Alerter Error]:', err.message);
    return false;
  }
}
