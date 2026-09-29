// ============================================================
// XIVIZLEY Suite — Discord Webhook Notification Dispatcher
// Uptime downtimes, WAF security blocks and backup alerts
// ============================================================

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordAlertOptions {
  title: string;
  description: string;
  color?: number; // Hex color integer, e.g. 0x0082c9
  fields?: DiscordEmbedField[];
}

export async function sendDiscordAlert(
  options: DiscordAlertOptions,
  webhookUrl = process.env.DISCORD_WEBHOOK_URL
): Promise<boolean> {
  if (!webhookUrl) {
    return false;
  }

  const payload = {
    username: "XIVIZLEY Cloud Bot",
    avatar_url: "https://suite.xivizley.com.tr/icon.svg",
    embeds: [
      {
        title: options.title,
        description: options.description,
        color: options.color || 0x0082c9,
        fields: options.fields || [],
        footer: {
          text: "XIVIZLEY Suite • Homelab VDS (185.233.164.122)",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    return res.ok;
  } catch (err: any) {
    console.error("[Discord Webhook Error]:", err.message);
    return false;
  }
}
