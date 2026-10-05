import type { FastifyPluginAsync } from "fastify";
import fs from "node:fs";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb, files } from "@xivizley/db";
import { withXivizleyAuth } from "@xivizley/xivizley-id";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_USER_ID = "d0000000-0000-0000-0000-000000000001";

function resolveUserId(request: any): string {
  if (request.user?.role === "guest" || request.user?.id === DEMO_USER_ID) {
    return DEMO_USER_ID;
  }
  return request.user?.id || DEFAULT_USER_ID;
}

export const photosRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb();

  await fastify.register(withXivizleyAuth, { optional: true });

  // 1. GET /api/photos - Görsel ve videoları getir
  fastify.get("/api/photos", async (request, reply) => {
    const userId = resolveUserId(request);

    // MIME tipi image/* veya video/* olan dosyalar
    const mediaFiles = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.userId, userId),
          eq(files.isTrashed, false),
          sql`(${files.mimeType} LIKE 'image/%' OR ${files.mimeType} LIKE 'video/%')`,
        ),
      )
      .orderBy(desc(files.createdAt));

    return reply.send({ ok: true, data: mediaFiles });
  });

  // 2. GET /api/photos/:id/stream - Görsel akışı
  fastify.get<{
    Params: { id: string };
  }>("/api/photos/:id/stream", async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params;

    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, userId)))
      .limit(1);

    if (!file || !fs.existsSync(file.storagePath)) {
      return reply
        .status(404)
        .send({ ok: false, message: "Medya bulunamadı." });
    }

    reply.header("Content-Type", file.mimeType || "image/jpeg");
    reply.header("Cache-Control", "public, max-age=86400");

    const stream = fs.createReadStream(file.storagePath);
    return reply.send(stream);
  });
};
