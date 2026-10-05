import type { FastifyPluginAsync } from "fastify";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { getDb, notes } from "@xivizley/db";
import { withXivizleyAuth } from "@xivizley/xivizley-id";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_USER_ID = "d0000000-0000-0000-0000-000000000001";

function resolveUserId(request: any): string {
  if (request.user?.role === "guest" || request.user?.id === DEMO_USER_ID) {
    return DEMO_USER_ID;
  }
  return request.user?.id || DEFAULT_USER_ID;
}

export const notesRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb();

  // Auth desteği
  await fastify.register(withXivizleyAuth, { optional: true });

  // 1. GET /api/notes - Notları listele
  fastify.get<{
    Querystring: { search?: string; category?: string; favorite?: string };
  }>("/api/notes", async (request, reply) => {
    const userId = resolveUserId(request);
    const { search, category, favorite } = request.query;

    let allNotes: any[] = [];
    try {
      allNotes = await db
        .select()
        .from(notes)
        .where(eq(notes.userId, userId))
        .orderBy(desc(notes.isPinned), desc(notes.updatedAt));
    } catch {
      // In-memory / disconnected fallback
    }

    let filtered = allNotes;
    if (
      filtered.length === 0 &&
      (request.user?.role === "guest" || userId === DEMO_USER_ID)
    ) {
      filtered = [
        {
          id: "demo-note-welcome",
          userId: DEMO_USER_ID,
          title: "👋 XIVIZLEY Suite Canlı Demo Modu",
          content:
            "XIVIZLEY ekosistemine hoş geldiniz! Canlı demo modunda tüm verileriniz izole ve salt-okunur durumdadır.",
          category: "Genel",
          isFavorite: true,
          isPinned: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ];
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      );
    }
    if (category && category !== "all") {
      filtered = filtered.filter((n) => n.category === category);
    }
    if (favorite === "true") {
      filtered = filtered.filter((n) => n.isFavorite);
    }

    return reply.send({ ok: true, data: filtered });
  });

  // 2. POST /api/notes - Yeni not oluştur
  fastify.post<{
    Body: { title?: string; content?: string; category?: string };
  }>("/api/notes", async (request, reply) => {
    const userId = resolveUserId(request);
    const {
      title = "Yeni Not",
      content = "",
      category = "Genel",
    } = request.body || {};

    const [newNote] = await db
      .insert(notes)
      .values({
        userId,
        title,
        content,
        category,
      })
      .returning();

    return reply.send({ ok: true, data: newNote });
  });

  // 3. GET /api/notes/:id - Tek not getir
  fastify.get<{
    Params: { id: string };
  }>("/api/notes/:id", async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params;

    if (
      id === "demo-note-welcome" &&
      (request.user?.role === "guest" || userId === DEMO_USER_ID)
    ) {
      return reply.send({
        ok: true,
        data: {
          id: "demo-note-welcome",
          userId: DEMO_USER_ID,
          title: "👋 XIVIZLEY Suite Canlı Demo Modu",
          content:
            "XIVIZLEY ekosistemine hoş geldiniz! Canlı demo modunda tüm verileriniz izole ve salt-okunur durumdadır.",
          category: "Genel",
          isFavorite: true,
          isPinned: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);

    if (!note) {
      return reply.status(404).send({ ok: false, message: "Not bulunamadı." });
    }

    return reply.send({ ok: true, data: note });
  });

  // 4. PUT /api/notes/:id - Notu güncelle
  fastify.put<{
    Params: { id: string };
    Body: {
      title?: string;
      content?: string;
      category?: string;
      isFavorite?: boolean;
      isPinned?: boolean;
    };
  }>("/api/notes/:id", async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params;
    const body = request.body || {};

    const [updated] = await db
      .update(notes)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.isFavorite !== undefined
          ? { isFavorite: body.isFavorite }
          : {}),
        ...(body.isPinned !== undefined ? { isPinned: body.isPinned } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();

    if (!updated) {
      return reply.status(404).send({ ok: false, message: "Not bulunamadı." });
    }

    return reply.send({ ok: true, data: updated });
  });

  // 5. DELETE /api/notes/:id - Not sil
  fastify.delete<{
    Params: { id: string };
  }>("/api/notes/:id", async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params;

    await db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)));

    return reply.send({ ok: true });
  });

  // 6. POST /api/notes/:id/favorite - Favori aç/kapat
  fastify.post<{
    Params: { id: string };
  }>("/api/notes/:id/favorite", async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params;

    const [existing] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ ok: false, message: "Not bulunamadı." });
    }

    const [updated] = await db
      .update(notes)
      .set({ isFavorite: !existing.isFavorite, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();

    return reply.send({ ok: true, data: updated });
  });
};
