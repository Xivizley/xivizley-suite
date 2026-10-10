// ============================================================
// XIVIZLEY Hub — CalDAV server (two-way sync with Thunderbird,
// Apple Calendar, DAVx5, etc.)
// apps/sso/src/server/caldav-routes.ts
// ============================================================

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import argon2 from "argon2";
import { eq, and, asc } from "drizzle-orm";
import { getDb, calendarEvents, users } from "@xivizley/db";
import { eventsToIcs, parseIcs } from "../lib/calendar-ics.js";

const CTAG = () => `"ctag-${Date.now()}"`;

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseBasic(auth?: string): { email: string; password: string } | null {
  if (!auth || !auth.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx === -1) return null;
    return { email: decoded.slice(0, idx), password: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

interface DavUser {
  userId: string;
  email: string;
}

async function authUser(request: FastifyRequest): Promise<DavUser | null> {
  const basic = parseBasic(request.headers["authorization"]);
  if (!basic) return null;
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, basic.email.trim().toLowerCase()))
      .limit(1);
    const user = rows[0];
    if (!user || user.passwordHash === "argon2_dummy_hash") return null;
    const valid = await argon2
      .verify(user.passwordHash, basic.password)
      .catch(() => false);
    if (!valid) return null;
    return { userId: user.id, email: user.email };
  } catch {
    return null;
  }
}

function eventIcs(row: any): string {
  return eventsToIcs(
    [
      {
        id: row.uid || row.id,
        title: row.title,
        description: row.description,
        location: row.location,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        allDay: row.allDay,
      },
    ],
    "XIVIZLEY Takvim",
  );
}

function eventEtag(row: any): string {
  const v = row.updatedAt ? new Date(row.updatedAt).getTime() : row.id;
  return `"${row.uid || row.id}-${v}"`;
}

export const caldavRoutes: FastifyPluginAsync = async (fastify) => {
  // Custom HTTP methods used by CalDAV
  fastify.addHttpMethod("PROPFIND", { hasBody: true });
  fastify.addHttpMethod("REPORT", { hasBody: true });
  fastify.addHttpMethod("PROPPATCH");
  fastify.addHttpMethod("MKCALENDAR");

  // Raw body parsers
  fastify.addContentTypeParser(
    ["text/calendar", "application/ics"],
    { parseAs: "string" },
    (_req, body, done) => done(null, body),
  );
  fastify.addContentTypeParser(
    ["application/xml", "text/xml"],
    { parseAs: "string" },
    (_req, body, done) => done(null, body),
  );

  const unauth = (reply: FastifyReply) =>
    reply
      .header("WWW-Authenticate", 'Basic realm="XIVIZLEY CalDAV"')
      .status(401)
      .send("Unauthorized");

  const davHeaders = (reply: FastifyReply) =>
    reply
      .header("DAV", "1, 2, 3, calendar-access")
      .header(
        "Allow",
        "OPTIONS, GET, HEAD, PUT, DELETE, PROPFIND, PROPPATCH, REPORT, MKCALENDAR",
      );

  // ─── Discovery ─────────────────────────────────────────────
  fastify.get("/.well-known/caldav", async (_req, reply) => {
    reply.header("Location", "/dav/");
    return reply.status(301).send();
  });

  const optionsHandler = async (_req: FastifyRequest, reply: FastifyReply) => {
    davHeaders(reply);
    return reply.status(200).send();
  };
  fastify.route({ method: "OPTIONS", url: "/dav", handler: optionsHandler });
  fastify.route({ method: "OPTIONS", url: "/dav/*", handler: optionsHandler });

  // ─── PROPFIND ──────────────────────────────────────────────
  fastify.route({
    method: "PROPFIND",
    url: "/dav",
    handler: handlePropfind,
  });
  fastify.route({
    method: "PROPFIND",
    url: "/dav/*",
    handler: handlePropfind,
  });

  async function handlePropfind(request: FastifyRequest, reply: FastifyReply) {
    const user = await authUser(request);
    if (!user) return unauth(reply);

    const rest = ((request.params as any)["*"] || "").replace(/^\/+|\/+$/g, "");
    const depth = String(request.headers["depth"] || "0");
    const e = user.email;
    const principal = `/dav/principals/${e}/`;
    const home = `/dav/calendars/${e}/`;
    const calHref = `/dav/calendars/${e}/default/`;

    const responses: string[] = [];

    const resp = (href: string, props: string) =>
      `<D:response><D:href>${esc(href)}</D:href><D:propstat><D:prop>${props}</D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response>`;

    const commonProps = `
      <D:current-user-principal><D:href>${esc(principal)}</D:href></D:current-user-principal>
      <D:principal-URL><D:href>${esc(principal)}</D:href></D:principal-URL>`;

    const collectionType = `<D:resourcetype><D:collection/></D:resourcetype>`;
    const calendarType = `<D:resourcetype><D:collection/><C:calendar/></D:resourcetype>`;

    const calendarProps = `${calendarType}
      <D:displayname>XIVIZLEY Takvim</D:displayname>
      <C:calendar-home-set><D:href>${esc(home)}</D:href></C:calendar-home-set>
      <C:supported-calendar-component-set><C:comp name="VEVENT"/></C:supported-calendar-component-set>
      <CS:getctag>${CTAG()}</CS:getctag>
      <D:sync-token>${esc(CTAG())}</D:sync-token>
      <D:supported-report-set>
        <D:supported-report><D:report><C:calendar-query/></D:report></D:supported-report>
        <D:supported-report><D:report><C:calendar-multiget/></D:report></D:supported-report>
      </D:supported-report-set>`;

    // root or calendar-home or principal or calendar
    if (rest === "" || rest === "/") {
      responses.push(resp("/dav/", collectionType + commonProps));
      if (depth !== "0") {
        responses.push(
          resp(
            principal,
            collectionType +
              commonProps +
              `<C:calendar-home-set><D:href>${esc(home)}</D:href></C:calendar-home-set>`,
          ),
        );
        responses.push(
          resp(
            home,
            collectionType +
              `<C:calendar-home-set><D:href>${esc(home)}</D:href></C:calendar-home-set>`,
          ),
        );
        responses.push(resp(calHref, calendarProps));
      }
    } else if (rest === `principals/${e}`) {
      responses.push(
        resp(
          principal,
          collectionType +
            commonProps +
            `<C:calendar-home-set><D:href>${esc(home)}</D:href></C:calendar-home-set>`,
        ),
      );
    } else if (rest === `calendars/${e}`) {
      responses.push(
        resp(
          home,
          collectionType +
            `<C:calendar-home-set><D:href>${esc(home)}</D:href></C:calendar-home-set>`,
        ),
      );
      if (depth !== "0") {
        responses.push(resp(calHref, calendarProps));
      }
    } else if (rest === `calendars/${e}/default`) {
      responses.push(resp(calHref, calendarProps));
      if (depth !== "0") {
        const rows = await listEvents(user.userId);
        for (const row of rows) {
          responses.push(
            resp(
              `${calHref}${row.uid || row.id}.ics`,
              `<D:getetag>${esc(eventEtag(row))}</D:getetag>${calendarType.replace("<C:calendar/>", "")}<D:getcontenttype>text/calendar; charset=utf-8</D:getcontenttype>`,
            ),
          );
        }
      }
    } else {
      return reply.status(404).send("Not found");
    }

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:CS="http://calendarserver.org/ns/">
${responses.join("\n")}
</D:multistatus>`;

    reply.header("Content-Type", "application/xml; charset=utf-8");
    return reply.status(207).send(xml);
  }

  // ─── REPORT (calendar-query / multiget) ────────────────────
  fastify.route({
    method: "REPORT",
    url: "/dav/*",
    handler: async (request, reply) => {
      const user = await authUser(request);
      if (!user) return unauth(reply);

      const e = user.email;
      const calHref = `/dav/calendars/${e}/default/`;
      const rows = await listEvents(user.userId);

      const items = rows
        .map(
          (row) => `<D:response>
  <D:href>${esc(`${calHref}${row.uid || row.id}.ics`)}</D:href>
  <D:propstat><D:prop>
    <D:getetag>${esc(eventEtag(row))}</D:getetag>
    <C:calendar-data>${esc(eventIcs(row))}</C:calendar-data>
  </D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat>
</D:response>`,
        )
        .join("\n");

      const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
${items}
</D:multistatus>`;
      reply.header("Content-Type", "application/xml; charset=utf-8");
      return reply.status(207).send(xml);
    },
  });

  // ─── GET / PUT / DELETE ────────────────────────────────────
  fastify.route({
    method: ["GET", "PUT", "DELETE"],
    url: "/dav/*",
    handler: async (request, reply) => {
      const user = await authUser(request);
      if (!user) return unauth(reply);

      const rest = ((request.params as any)["*"] || "").replace(/^\/+/, "");
      const e = user.email;
      const isCalendar =
        rest === `calendars/${e}/default` || rest === `calendars/${e}/default/`;
      const single = rest.match(new RegExp(`^calendars/${e}/default/(.+)\\.ics$`));

      if (request.method === "GET") {
        if (isCalendar) {
          const rows = await listEvents(user.userId);
          reply.header("Content-Type", "text/calendar; charset=utf-8");
          return reply.send(
            eventsToIcs(
              rows.map((r) => ({
                id: r.uid || r.id,
                title: r.title,
                description: r.description,
                location: r.location,
                startsAt: r.startsAt,
                endsAt: r.endsAt,
                allDay: r.allDay,
              })),
              "XIVIZLEY Takvim",
            ),
          );
        }
        if (single) {
          const rows = await listEvents(user.userId);
          const row = rows.find((r) => (r.uid || r.id) === single[1]);
          if (!row) return reply.status(404).send("Not found");
          reply.header("Content-Type", "text/calendar; charset=utf-8");
          reply.header("ETag", eventEtag(row));
          return reply.send(eventIcs(row));
        }
        return reply.status(404).send("Not found");
      }

      if (request.method === "PUT") {
        if (!single) return reply.status(405).send("PUT only on event .ics");
        const uid = single[1];
        const body =
          typeof request.body === "string" ? request.body : String(request.body ?? "");
        const parsed = parseIcs(body);
        const ev = parsed[0];
        if (!ev) return reply.status(400).send("Geçersiz ICS");
        await upsertEvent(user.userId, uid, ev);
        return reply.status(201).send();
      }

      if (request.method === "DELETE") {
        if (!single) return reply.status(405).send("DELETE only on event .ics");
        const uid = single[1];
        const db = getDb();
        await db
          .delete(calendarEvents)
          .where(
            and(eq(calendarEvents.userId, user.userId), eq(calendarEvents.uid, uid)),
          );
        return reply.status(204).send();
      }

      return reply.status(405).send();
    },
  });

  // ─── helpers ───────────────────────────────────────────────
  async function listEvents(userId: string) {
    try {
      const db = getDb();
      return await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.userId, userId))
        .orderBy(asc(calendarEvents.startsAt));
    } catch {
      return [] as any[];
    }
  }

  async function upsertEvent(
    userId: string,
    uid: string,
    ev: {
      title: string;
      description?: string | undefined;
      location?: string | undefined;
      startsAt: string;
      endsAt: string;
      allDay: boolean;
    },
  ) {
    const db = getDb();
    const existing = await db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.uid, uid)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(calendarEvents)
        .set({
          title: ev.title,
          description: ev.description ?? null,
          location: ev.location ?? null,
          startsAt: new Date(ev.startsAt),
          endsAt: new Date(ev.endsAt),
          allDay: ev.allDay,
          updatedAt: new Date(),
        })
        .where(eq(calendarEvents.id, existing[0].id));
    } else {
      await db.insert(calendarEvents).values({
        userId,
        uid,
        title: ev.title,
        description: ev.description ?? null,
        location: ev.location ?? null,
        startsAt: new Date(ev.startsAt),
        endsAt: new Date(ev.endsAt),
        allDay: ev.allDay,
        color: "#0082c9",
      });
    }
  }
};
