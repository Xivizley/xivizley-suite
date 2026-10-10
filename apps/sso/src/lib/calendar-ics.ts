// ============================================================
// XIVIZLEY Calendar — ICS (iCalendar) Serialize / Parse
// apps/sso/src/lib/calendar-ics.ts
// ============================================================

export interface CalendarEventLike {
  id?: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  allDay?: boolean;
  color?: string | null;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** ISO/Date → ICS date string (UTC or all-day DATE). */
export function formatIcsDate(value: Date | string, allDay = false): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  if (allDay) return `${y}${m}${day}`;
  return `${y}${m}${day}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(
    d.getUTCSeconds(),
  )}Z`;
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold long lines per RFC 5545 (75 octets). */
function foldLine(line: string): string {
  if (line.length <= 74) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length > 0) {
    chunks.push(" " + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  return chunks.join("\r\n");
}

/** Serializes events into a full VCALENDAR string. */
export function eventsToIcs(
  events: CalendarEventLike[],
  calName = "XIVIZLEY Calendar",
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//XIVIZLEY//Calendar//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calName)}`,
  ];

  for (const ev of events) {
    const allDay = Boolean(ev.allDay);
    const uid = ev.id || `xivizley-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}@calendar.xivizley`);
    lines.push(`DTSTAMP:${formatIcsDate(new Date())}`);
    lines.push(
      allDay
        ? `DTSTART;VALUE=DATE:${formatIcsDate(ev.startsAt, true)}`
        : `DTSTART:${formatIcsDate(ev.startsAt)}`,
    );
    lines.push(
      allDay
        ? `DTEND;VALUE=DATE:${formatIcsDate(ev.endsAt, true)}`
        : `DTEND:${formatIcsDate(ev.endsAt)}`,
    );
    lines.push(`SUMMARY:${escapeIcs(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcs(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeIcs(ev.location)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export interface ParsedIcsEvent {
  title: string;
  description?: string | undefined;
  location?: string | undefined;
  startsAt: string; // ISO
  endsAt: string; // ISO
  allDay: boolean;
}

/** Unfold ICS content lines (RFC 5545 line folding). */
function unfold(ics: string): string[] {
  const raw = ics.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] = (out[out.length - 1] ?? "") + line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Parses a date/date-time ICS value into an ISO string. */
function parseIcsDate(value: string): { iso: string; allDay: boolean } | null {
  const v = value.trim();
  // All-day: YYYYMMDD
  if (/^\d{8}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    return { iso: new Date(Date.UTC(y, m - 1, d)).toISOString(), allDay: true };
  }
  // DateTime: YYYYMMDDTHHMMSS[Z]
  const match = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (match) {
    const [, y, mo, d, h, mi, s] = match;
    const ms = Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    );
    // If no Z, treat the naive time as UTC (best-effort).
    return { iso: new Date(ms).toISOString(), allDay: false };
  }
  return null;
}

function unescapeIcs(text: string): string {
  return text
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/** Parses a VCALENDAR string into a list of events. */
export function parseIcs(ics: string): ParsedIcsEvent[] {
  const lines = unfold(ics);
  const events: ParsedIcsEvent[] = [];

  let current: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) {
        const startRaw = current["DTSTART"];
        const endRaw = current["DTEND"] || current["DTSTART"];
        const start = startRaw ? parseIcsDate(startRaw) : null;
        const end = endRaw ? parseIcsDate(endRaw) : null;
        const title = current["SUMMARY"] ? unescapeIcs(current["SUMMARY"]) : "";
        if (start) {
          events.push({
            title: title || "Başlıksız Etkinlik",
            description: current["DESCRIPTION"]
              ? unescapeIcs(current["DESCRIPTION"])
              : undefined,
            location: current["LOCATION"]
              ? unescapeIcs(current["LOCATION"])
              : undefined,
            startsAt: start.iso,
            endsAt: (end ? end.iso : start.iso),
            allDay: start.allDay,
          });
        }
      }
      current = null;
      continue;
    }
    if (current) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const keyPart = line.slice(0, idx);
      const value = line.slice(idx + 1);
      const key = (keyPart.split(";")[0] ?? "").toUpperCase();
      current[key] = value;
    }
  }

  return events;
}
