import type { FastifyPluginAsync } from "fastify";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { getDb, calendarEvents } from "@xivizley/db";
import { withXivizleyAuth } from "@xivizley/xivizley-id";
import { eventsToIcs, parseIcs } from "../lib/calendar-ics.js";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_USER_ID = "d0000000-0000-0000-0000-000000000001";

function resolveUserId(request: any): string {
  if (request.user?.role === "guest" || request.user?.id === DEMO_USER_ID) {
    return DEMO_USER_ID;
  }
  return request.user?.id || DEFAULT_USER_ID;
}

function demoEvents() {
  const now = new Date();
  const y = now.getUTCFullYear();
  return [
    {
      id: "demo-cal-tubitak",
      userId: DEMO_USER_ID,
      title: "TÜBİTAK 2204 son başvuru (17:30)",
      description: "XIVIZLEY CV hedefi — proje raporu ve TYBS başvurusu.",
      location: "https://tybs.tubitak.gov.tr/",
      startsAt: new Date(Date.UTC(y + 1, 0, 4, 14, 30)).toISOString(),
      endsAt: new Date(Date.UTC(y + 1, 0, 4, 15, 30)).toISOString(),
      allDay: false,
      color: "#e9322d",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "demo-cal-review",
      userId: DEMO_USER_ID,
      title: "Haftalık CV hedef kontrolü",
      description: "İlerlemeyi gözden geçir, sonraki haftayı planla.",
      location: null,
      startsAt: new Date(Date.UTC(y, now.getUTCMonth(), now.getUTCDate() + 3, 17, 0)).toISOString(),
      endsAt: new Date(Date.UTC(y, now.getUTCMonth(), now.getUTCDate() + 3, 17, 30)).toISOString(),
      allDay: false,
      color: "#0082c9",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
}

export const calendarRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb();
  await fastify.register(withXivizleyAuth, { optional: true });

  // 1. GET /api/calendar/events — listele (opsiyonel from/to ISO aralığı)
  fastify.get<{ Querystring: { from?: string; to?: string } }>(
    "/api/calendar/events",
    async (request, reply) => {
      const userId = resolveUserId(request);
      const { from, to } = request.query;

      let rows: any[] = [];
      try {
        const conditions = [eq(calendarEvents.userId, userId)];
        if (from) conditions.push(gte(calendarEvents.startsAt, new Date(from)));
        if (to) conditions.push(lte(calendarEvents.startsAt, new Date(to)));

        rows = await db
          .select()
          .from(calendarEvents)
          .where(and(...conditions))
          .orderBy(asc(calendarEvents.startsAt));
      } catch {
        // fallback
      }

      if (rows.length === 0 && userId === DEMO_USER_ID) {
        rows = demoEvents() as any;
      }

      return reply.send({ ok: true, data: rows });
    },
  );

  // 2. POST /api/calendar/events — yeni etkinlik
  fastify.post<{
    Body: {
      title?: string;
      description?: string;
      location?: string;
      startsAt?: string;
      endsAt?: string;
      allDay?: boolean;
      color?: string;
    };
  }>("/api/calendar/events", async (request, reply) => {
    const userId = resolveUserId(request);
    const body = request.body || {};
    if (!body.title || !body.startsAt) {
      return reply
        .status(400)
        .send({ ok: false, message: "Başlık ve başlangıç tarihi zorunludur." });
    }

    const startsAt = new Date(body.startsAt);
    const endsAt = body.endsAt ? new Date(body.endsAt) : new Date(startsAt);

    const [created] = await db
      .insert(calendarEvents)
      .values({
        userId,
        title: body.title,
        description: body.description,
        location: body.location,
        startsAt,
        endsAt,
        allDay: Boolean(body.allDay),
        color: body.color || "#0082c9",
      })
      .returning();

    return reply.send({ ok: true, data: created });
  });

  // 3. PUT /api/calendar/events/:id — güncelle
  fastify.put<{
    Params: { id: string };
    Body: Record<string, unknown>;
  }>("/api/calendar/events/:id", async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params;
    const b = (request.body || {}) as any;

    const [updated] = await db
      .update(calendarEvents)
      .set({
        ...(b.title !== undefined ? { title: b.title } : {}),
        ...(b.description !== undefined ? { description: b.description } : {}),
        ...(b.location !== undefined ? { location: b.location } : {}),
        ...(b.startsAt !== undefined ? { startsAt: new Date(b.startsAt) } : {}),
        ...(b.endsAt !== undefined ? { endsAt: new Date(b.endsAt) } : {}),
        ...(b.allDay !== undefined ? { allDay: Boolean(b.allDay) } : {}),
        ...(b.color !== undefined ? { color: b.color } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)))
      .returning();

    if (!updated) {
      return reply.status(404).send({ ok: false, message: "Etkinlik bulunamadı." });
    }
    return reply.send({ ok: true, data: updated });
  });

  // 4. DELETE /api/calendar/events/:id — sil
  fastify.delete<{ Params: { id: string } }>(
    "/api/calendar/events/:id",
    async (request, reply) => {
      const userId = resolveUserId(request);
      const { id } = request.params;
      await db
        .delete(calendarEvents)
        .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
      return reply.send({ ok: true });
    },
  );

  // 5. GET /api/calendar/export.ics — ICS dışa aktar
  fastify.get("/api/calendar/export.ics", async (request, reply) => {
    const userId = resolveUserId(request);
    let rows: any[] = [];
    try {
      rows = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.userId, userId))
        .orderBy(asc(calendarEvents.startsAt));
    } catch {
      // fallback
    }
    if (rows.length === 0 && userId === DEMO_USER_ID) rows = demoEvents() as any;

    const ics = eventsToIcs(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        location: r.location,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        allDay: r.allDay,
      })),
      "XIVIZLEY Takvim",
    );

    reply
      .header("Content-Type", "text/calendar; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="xivizley-takvim.ics"');
    return reply.send(ics);
  });

  // 6. POST /api/calendar/import — ICS içe aktar
  fastify.post<{ Body: { ics?: string } }>(
    "/api/calendar/import",
    async (request, reply) => {
      const userId = resolveUserId(request);
      const ics = (request.body || {}).ics;
      if (!ics || typeof ics !== "string") {
        return reply.status(400).send({ ok: false, message: "ICS içeriği gerekli." });
      }

      const parsed = parseIcs(ics);
      if (parsed.length === 0) {
        return reply
          .status(400)
          .send({ ok: false, message: "Geçerli etkinlik bulunamadı." });
      }

      const inserted = await db
        .insert(calendarEvents)
        .values(
          parsed.map((e) => ({
            userId,
            title: e.title,
            description: e.description,
            location: e.location,
            startsAt: new Date(e.startsAt),
            endsAt: new Date(e.endsAt),
            allDay: e.allDay,
          })),
        )
        .returning();

      return reply.send({ ok: true, count: inserted.length, data: inserted });
    },
  );
};
