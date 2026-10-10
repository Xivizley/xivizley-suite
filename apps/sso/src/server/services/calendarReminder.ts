// ============================================================
// XIVIZLEY Hub — Calendar Email Reminder Daemon
// apps/sso/src/server/services/calendarReminder.ts
// Periodically emails reminders for upcoming events.
// ============================================================

import { and, isNotNull, isNull, eq } from "drizzle-orm";
import { getDb, calendarEvents } from "@xivizley/db";
import { eventsToIcs } from "../../lib/calendar-ics.js";
import { sendMail, isMailConfigured } from "./mailer.js";

let daemonInterval: ReturnType<typeof setInterval> | null = null;

function fmt(d: Date): string {
  return d.toLocaleString("tr-TR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  });
}

export async function runCalendarReminderCheck(): Promise<void> {
  if (!isMailConfigured()) return;

  let rows: any[] = [];
  try {
    const db = getDb();
    rows = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          isNotNull(calendarEvents.reminderMinutes),
          isNull(calendarEvents.reminderSentAt),
          isNotNull(calendarEvents.notifyEmail),
        ),
      );
  } catch {
    return;
  }

  const now = Date.now();
  for (const ev of rows) {
    const startsAt = new Date(ev.startsAt).getTime();
    if (startsAt <= now) continue; // geçmiş etkinlik
    const remindAt = startsAt - (ev.reminderMinutes ?? 0) * 60_000;
    if (remindAt > now) continue; // henüz vakti gelmedi

    const to = ev.notifyEmail as string;
    const startDate = new Date(ev.startsAt);
    const ok = await sendMail({
      to,
      subject: `⏰ Hatırlatma: ${ev.title}`,
      text: `Yaklaşan etkinlik: ${ev.title}\nZaman: ${fmt(startDate)}${
        ev.location ? `\nKonum: ${ev.location}` : ""
      }\n\nXIVIZLEY Takvim`,
      html: `<div style="font-family:sans-serif">
        <h2 style="color:#0082c9">⏰ Hatırlatma</h2>
        <p><strong>${ev.title}</strong></p>
        <p>🗓️ ${fmt(startDate)}${ev.location ? `<br/>📍 ${ev.location}` : ""}</p>
        ${ev.description ? `<p style="color:#555">${ev.description}</p>` : ""}
        <p style="font-size:12px;color:#888">XIVIZLEY Takvim</p>
      </div>`,
      ics: eventsToIcs([{ ...ev, startsAt: ev.startsAt, endsAt: ev.endsAt }]),
      icsFilename: "xivizley-etkinlik.ics",
    });

    if (ok) {
      try {
        const db = getDb();
        await db
          .update(calendarEvents)
          .set({ reminderSentAt: new Date() })
          .where(eq(calendarEvents.id, ev.id));
      } catch {
        // ignore
      }
    }
  }
}

export function startCalendarReminderDaemon(intervalSeconds = 300): void {
  if (daemonInterval) return;
  runCalendarReminderCheck().catch(() => {});
  daemonInterval = setInterval(() => {
    runCalendarReminderCheck().catch(() => {});
  }, intervalSeconds * 1000);
}
