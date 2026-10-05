// ============================================================
// XIVIZLEY Suite — Multi-Channel Ops Alert Engine (Discord & Webhook)
// Rich Discord Embeds with Cooldown/Debounce & Sentinel Integration
// ============================================================

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description: string;
  url?: string;
  color?: number; // 0x22c55e (recovery), 0xeab308 (warning), 0xef4444 (critical)
  fields?: DiscordEmbedField[];
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
}

export interface OpsAlertEvent {
  key: string;
  title: string;
  description: string;
  severity: "recovery" | "warning" | "critical";
  metric?: string;
  value?: string | number;
  serverName?: string;
  pulseUrl?: string;
}

export interface NotificationConfig {
  discordWebhookUrl: string | null;
  maskedDiscordWebhookUrl: string | null;
  discordEnabled: boolean;
  debounceMinutes: number;
}

const SERVER_LABEL = "Bursa PenDC Tier-3 VDS - 178.210.168.163";
const DEFAULT_PULSE_URL = "https://suite.xivizley.com.tr/pulse";

// Cooldown cache: alertKey -> timestamp (ms)
const discordAlertCooldowns = new Map<string, number>();

// In-memory config with environment fallback
let currentWebhookUrl: string | null = process.env.DISCORD_WEBHOOK_URL || null;
let currentEnabled: boolean = true;
let currentDebounceMinutes: number = 30;

/**
 * Mask sensitive parts of the webhook URL
 */
export function maskWebhookUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parts = url.split("/");
    const lastPart = parts[parts.length - 1];
    if (parts.length >= 2 && lastPart) {
      parts[parts.length - 1] = "••••••••" + lastPart.slice(-4);
      return parts.join("/");
    }
  } catch {}
  return "https://discord.com/api/webhooks/••••••••";
}

export function getNotificationConfig(): NotificationConfig {
  return {
    discordWebhookUrl: currentWebhookUrl,
    maskedDiscordWebhookUrl: maskWebhookUrl(currentWebhookUrl),
    discordEnabled: currentEnabled,
    debounceMinutes: currentDebounceMinutes,
  };
}

export function updateNotificationConfig(config: {
  discordWebhookUrl?: string | null | undefined;
  discordEnabled?: boolean | undefined;
  debounceMinutes?: number | undefined;
}): NotificationConfig {
  if (typeof config.discordWebhookUrl === "string") {
    currentWebhookUrl = config.discordWebhookUrl.trim() || null;
  } else if (config.discordWebhookUrl === null) {
    currentWebhookUrl = null;
  }

  if (typeof config.discordEnabled === "boolean") {
    currentEnabled = config.discordEnabled;
  }

  if (typeof config.debounceMinutes === "number") {
    currentDebounceMinutes = Math.max(1, config.debounceMinutes);
  }

  return getNotificationConfig();
}

/**
 * Check if the cooldown rule allows dispatching this alert
 */
export function canSendDiscordAlert(key: string, cooldownMinutes = currentDebounceMinutes): boolean {
  const lastTime = discordAlertCooldowns.get(key);
  if (!lastTime) return true;
  const now = Date.now();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  return now - lastTime >= cooldownMs;
}

export function markDiscordAlertSent(key: string): void {
  discordAlertCooldowns.set(key, Date.now());
}

export function clearDiscordAlertCooldown(key: string): void {
  discordAlertCooldowns.delete(key);
}

/**
 * Dispatches an embed payload to the Discord Webhook
 */
export async function sendDiscordEmbed(
  embed: DiscordEmbed,
  overrideWebhookUrl?: string | null
): Promise<boolean> {
  const webhookUrl = overrideWebhookUrl || currentWebhookUrl;
  if (!webhookUrl || !currentEnabled) {
    return false;
  }

  const payload = {
    username: "XIVIZLEY OpsCenter",
    avatar_url: "https://suite.xivizley.com.tr/icon.svg",
    embeds: [
      {
        title: embed.title,
        description: embed.description,
        url: embed.url || DEFAULT_PULSE_URL,
        color: embed.color ?? 0x0082c9,
        fields: embed.fields || [],
        footer: embed.footer || {
          text: SERVER_LABEL,
        },
        timestamp: embed.timestamp || new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    return res.ok;
  } catch (err: any) {
    console.error("[XIVIZLEY Discord Webhook Error]:", err.message);
    return false;
  }
}

/**
 * High-level ops alert sender with color mapping, cooldown enforcement & embed formatting
 */
export async function dispatchOpsDiscordAlert(event: OpsAlertEvent): Promise<boolean> {
  if (!canSendDiscordAlert(event.key)) {
    return false;
  }

  // Color mapping: Green for recovery, Yellow for warning, Red for critical
  let color = 0x0082c9;
  if (event.severity === "recovery") {
    color = 0x22c55e; // Green #22c55e
  } else if (event.severity === "warning") {
    color = 0xeab308; // Yellow #eab308
  } else if (event.severity === "critical") {
    color = 0xef4444; // Red #ef4444
  }

  const fields: DiscordEmbedField[] = [
    {
      name: "🖥️ Sunucu",
      value: event.serverName || SERVER_LABEL,
      inline: true,
    },
    {
      name: "📊 Tetiklenen Metrik",
      value: event.metric || "Sistem Sağlık Göstergesi",
      inline: true,
    },
  ];

  if (event.value !== undefined) {
    fields.push({
      name: "⚡ Anlık Değer",
      value: String(event.value),
      inline: true,
    });
  }

  fields.push({
    name: "🔗 Pulse Kontrol Paneli",
    value: `[suite.xivizley.com.tr/pulse](${event.pulseUrl || DEFAULT_PULSE_URL})`,
    inline: false,
  });

  const success = await sendDiscordEmbed({
    title: event.title,
    description: event.description,
    url: event.pulseUrl || DEFAULT_PULSE_URL,
    color,
    fields,
    footer: {
      text: `${SERVER_LABEL} • 30dk Sessizlik Kuralı`,
    },
    timestamp: new Date().toISOString(),
  });

  if (success) {
    markDiscordAlertSent(event.key);
  }

  return success;
}

/**
 * Triggers an instant test card to verify Discord webhook connectivity
 */
export async function sendTestDiscordAlert(
  customWebhookUrl?: string
): Promise<{ ok: boolean; message: string }> {
  const targetUrl = customWebhookUrl || currentWebhookUrl;
  if (!targetUrl) {
    return {
      ok: false,
      message: "Discord Webhook URL tanımlı değil. Lütfen geçerli bir webhook bağlantısı girin.",
    };
  }

  const testEmbed: DiscordEmbed = {
    title: "🔔 XIVIZLEY OpsCenter — Test Alarmı",
    description:
      "Discord Webhook entegrasyonu başarıyla doğrulandı! Sistem metrikleri ve konteyner arızaları anlık olarak bu kanala iletilecektir.",
    url: DEFAULT_PULSE_URL,
    color: 0x22c55e, // Green
    fields: [
      {
        name: "🖥️ Sunucu",
        value: SERVER_LABEL,
        inline: true,
      },
      {
        name: "🛡️ Modül",
        value: "VDS Sentinel & OpsCenter v1.1",
        inline: true,
      },
      {
        name: "⏱️ Cooldown Süresi",
        value: `${currentDebounceMinutes} Dakika Sessizlik Kuralı`,
        inline: true,
      },
      {
        name: "🔗 Canlı Gözlem",
        value: `[suite.xivizley.com.tr/pulse](${DEFAULT_PULSE_URL})`,
        inline: false,
      },
    ],
    footer: {
      text: `${SERVER_LABEL} • Test Başarılı`,
    },
    timestamp: new Date().toISOString(),
  };

  const ok = await sendDiscordEmbed(testEmbed, targetUrl);

  if (ok) {
    // If custom URL succeeded, save it
    if (customWebhookUrl) {
      currentWebhookUrl = customWebhookUrl;
    }
    return {
      ok: true,
      message: "Discord test alarmı başarıyla gönderildi!",
    };
  } else {
    return {
      ok: false,
      message: "Discord Webhook isteği başarısız oldu. Webhook URL formatını kontrol ediniz.",
    };
  }
}
