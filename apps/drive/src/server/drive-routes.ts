import type { FastifyPluginAsync } from "fastify";
import multipart from "@fastify/multipart";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
import archiver from "archiver";
import { withXivizleyAuth } from "@xivizley/xivizley-id";
import { getDb, files, folders, shares } from "@xivizley/db";

const UPLOAD_DIR =
  process.env["DRIVE_STORAGE_PATH"] ||
  path.resolve(process.cwd(), ".storage/drive");
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

function resolveUserId(request: any): string {
  return request.user?.id || DEFAULT_USER_ID;
}

export const driveRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb();

  // Storage dizinini hazırla
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // Multipart desteği (5 GB maksimum dosya boyutu)
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024 * 1024, // 5GB
    },
  });

  // XIVIZLEY ID doğrulaması (oturum yoksa varsayılan admin kullanıcısına izin ver)
  await fastify.register(withXivizleyAuth, { optional: true });

  // ─── 1. GET /api/files (Dosya ve Klasörleri Listele & Filtrele) ───
  fastify.get<{
    Querystring: { folder_id?: string; filter?: string };
  }>("/api/files", async (request, reply) => {
    const userId = resolveUserId(request);
    const folderId = (request.query as any)?.folder_id || null;
    const filter = (request.query as any)?.filter || "all";

    let userFolders: any[] = [];
    let userFiles: any[] = [];

    if (filter === "trash") {
      // Çöp kutusu: çöp kutusundaki dosyalar
      userFiles = await db
        .select()
        .from(files)
        .where(and(eq(files.userId, userId), eq(files.isTrashed, true)))
        .orderBy(desc(files.trashedAt));
      userFolders = [];
    } else if (filter === "favorites") {
      // Favoriler: favorilenmiş ve silinmemiş dosya & klasörler
      userFolders = await db
        .select()
        .from(folders)
        .where(and(eq(folders.userId, userId), eq(folders.isFavorite, true)));

      userFiles = await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.userId, userId),
            eq(files.isFavorite, true),
            eq(files.isTrashed, false),
          ),
        )
        .orderBy(desc(files.createdAt));
    } else if (filter === "recent") {
      // Son kullanılanlar
      userFiles = await db
        .select()
        .from(files)
        .where(and(eq(files.userId, userId), eq(files.isTrashed, false)))
        .orderBy(desc(files.updatedAt))
        .limit(50);
      userFolders = [];
    } else if (filter === "shares") {
      // Paylaşılanlar
      userFiles = await db
        .select()
        .from(files)
        .where(and(eq(files.userId, userId), eq(files.isTrashed, false)))
        .limit(50);
      userFolders = [];
    } else {
      // "all" - Normal dizin hiyerarşisi
      userFolders = await db
        .select()
        .from(folders)
        .where(
          folderId
            ? and(eq(folders.userId, userId), eq(folders.parentId, folderId))
            : and(eq(folders.userId, userId), isNull(folders.parentId)),
        );

      userFiles = await db
        .select()
        .from(files)
        .where(
          folderId
            ? and(
                eq(files.userId, userId),
                eq(files.folderId, folderId),
                eq(files.isTrashed, false),
              )
            : and(
                eq(files.userId, userId),
                isNull(files.folderId),
                eq(files.isTrashed, false),
              ),
        )
        .orderBy(desc(files.createdAt));
    }

    return reply.send({
      ok: true,
      data: {
        folders: userFolders,
        files: userFiles,
      },
    });
  });

  // ─── 2. POST /api/folders (Yeni Klasör Oluştur) ─────────────
  fastify.post<{
    Body: { name: string; parent_id?: string; color?: string };
  }>("/api/folders", async (request, reply) => {
    const userId = resolveUserId(request);
    const { name, parent_id, color } = request.body || {};

    if (!name || !name.trim()) {
      return reply
        .status(400)
        .send({ ok: false, message: "Klasör adı zorunludur." });
    }

    try {
      const [newFolder] = await db
        .insert(folders)
        .values({
          userId,
          name: name.trim(),
          parentId: parent_id || null,
          color: color || "aurora-cyan",
        })
        .returning();

      return reply.send({ ok: true, data: newFolder });
    } catch (err: any) {
      fastify.log.error(err);
      return reply
        .status(500)
        .send({ ok: false, message: err?.message || "Klasör oluşturulamadı." });
    }
  });

  // ─── 3. POST /api/upload (Yüksek Hızlı Zero-Copy Yükleme) ───
  fastify.post("/api/upload", async (request, reply) => {
    const userId = resolveUserId(request);

    try {
      const data = await request.file();

      if (!data) {
        return reply
          .status(400)
          .send({ ok: false, message: "Yüklenecek dosya bulunamadı." });
      }

      const folderId = (data.fields?.folder_id as any)?.value || null;
      const originalName = data.filename;
      const mimeType = data.mimetype;

      // Kullanıcıya özel disk alt dizini
      const userStorageDir = path.join(UPLOAD_DIR, userId);
      if (!fs.existsSync(userStorageDir)) {
        fs.mkdirSync(userStorageDir, { recursive: true });
      }

      const uniqueId = crypto.randomUUID();
      const diskFileName = `${uniqueId}-${path.basename(originalName)}`;
      const targetFilePath = path.join(userStorageDir, diskFileName);

      // Fastify stream ile diske yaz
      const writeStream = fs.createWriteStream(targetFilePath);
      await pipeline(data.file, writeStream);

      const stats = fs.statSync(targetFilePath);

      // Veritabanına kaydet
      const [savedFile] = await db
        .insert(files)
        .values({
          userId,
          folderId: folderId || null,
          name: originalName,
          originalName,
          mimeType,
          sizeBytes: stats.size,
          storagePath: targetFilePath,
        })
        .returning();

      return reply.send({ ok: true, data: savedFile });
    } catch (err: any) {
      fastify.log.error(err);
      return reply
        .status(500)
        .send({ ok: false, message: err?.message || "Dosya yüklenemedi." });
    }
  });

  // ─── 4. GET /api/download/:id (Zero-Copy Akışla İndir) ──────
  fastify.get<{
    Params: { id: string };
  }>("/api/download/:id", async (request, reply) => {
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
        .send({ ok: false, message: "Dosya bulunamadı." });
    }

    reply.header("Content-Type", file.mimeType);
    reply.header(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.name)}"`,
    );
    reply.header("Content-Length", file.sizeBytes);

    const stream = fs.createReadStream(file.storagePath);
    return reply.send(stream);
  });

  // ─── 5. POST /api/files/:id/favorite (Favori Aç/Kapat) ──────
  fastify.post<{
    Params: { id: string };
  }>("/api/files/:id/favorite", async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params;

    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, userId)))
      .limit(1);

    if (!file) {
      return reply
        .status(404)
        .send({ ok: false, message: "Dosya bulunamadı." });
    }

    const [updated] = await db
      .update(files)
      .set({ isFavorite: !file.isFavorite })
      .where(eq(files.id, id))
      .returning();

    return reply.send({ ok: true, data: updated });
  });

  // ─── 6. DELETE /api/files/:id (Çöp Kutusuna Gönder) ─────────
  fastify.delete<{
    Params: { id: string };
  }>("/api/files/:id", async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params;

    const [updated] = await db
      .update(files)
      .set({ isTrashed: true, trashedAt: new Date() })
      .where(and(eq(files.id, id), eq(files.userId, userId)))
      .returning();

    if (!updated) {
      return reply
        .status(404)
        .send({ ok: false, message: "Dosya bulunamadı." });
    }

    return reply.send({ ok: true, data: updated });
  });

  // ─── 7. POST /api/files/:id/restore (Çöpten Geri Yükle) ──────
  fastify.post<{
    Params: { id: string };
  }>("/api/files/:id/restore", async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params;

    const [updated] = await db
      .update(files)
      .set({ isTrashed: false, trashedAt: null })
      .where(and(eq(files.id, id), eq(files.userId, userId)))
      .returning();

    if (!updated) {
      return reply
        .status(404)
        .send({ ok: false, message: "Dosya bulunamadı." });
    }

    return reply.send({ ok: true, data: updated });
  });

  // ─── 8. DELETE /api/files/:id/permanent (Kalıcı Olarak Sil) ─
  fastify.delete<{
    Params: { id: string };
  }>("/api/files/:id/permanent", async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params;

    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, userId)))
      .limit(1);

    if (file) {
      if (fs.existsSync(file.storagePath)) {
        try {
          fs.unlinkSync(file.storagePath);
        } catch {}
      }
      await db.delete(files).where(eq(files.id, id));
    }

    return reply.send({ ok: true });
  });

  // ─── 10. POST /api/shares (Paylaşım Bağlantısı Oluştur) ─────
  fastify.post<{
    Body: { fileId?: string; folderId?: string; expiresInDays?: number };
  }>("/api/shares", async (request, reply) => {
    const userId = resolveUserId(request);
    const { fileId, folderId, expiresInDays = 7 } = request.body || {};

    if (!fileId && !folderId) {
      return reply
        .status(400)
        .send({ ok: false, message: "Dosya veya klasör seçilmelidir." });
    }

    const shareToken = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    );

    const [newShare] = await db
      .insert(shares)
      .values({
        fileId: fileId || null,
        folderId: folderId || null,
        createdBy: userId,
        shareToken,
        expiresAt,
        allowDownload: true,
      })
      .returning();

    return reply.send({
      ok: true,
      data: {
        ...newShare,
        shareUrl: `https://drive.xivizley.com.tr/s/${shareToken}`,
      },
    });
  });

  // ─── 11. GET /api/shares/public/:token (Halka Açık Paylaşım Bilgisi) ───
  fastify.get<{
    Params: { token: string };
  }>("/api/shares/public/:token", async (request, reply) => {
    const { token } = request.params;

    const [share] = await db
      .select()
      .from(shares)
      .where(eq(shares.shareToken, token))
      .limit(1);

    if (!share) {
      return reply
        .status(404)
        .send({
          ok: false,
          message: "Paylaşım bağlantısı bulunamadı veya silinmiş.",
        });
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return reply
        .status(410)
        .send({
          ok: false,
          message: "Bu paylaşım bağlantısının süresi dolmuş.",
        });
    }

    let fileData: any = null;
    if (share.fileId) {
      const [f] = await db
        .select()
        .from(files)
        .where(eq(files.id, share.fileId))
        .limit(1);
      if (f) {
        fileData = {
          name: f.name,
          sizeBytes: f.sizeBytes,
          mimeType: f.mimeType,
          createdAt: f.createdAt,
        };
      }
    }

    return reply.send({
      ok: true,
      data: {
        token: share.shareToken,
        expiresAt: share.expiresAt,
        allowDownload: share.allowDownload,
        file: fileData,
      },
    });
  });

  // ─── 12. GET /api/download/public/:token (Halka Açık Paylaşım İndirme) ───
  fastify.get<{
    Params: { token: string };
  }>("/api/download/public/:token", async (request, reply) => {
    const { token } = request.params;

    const [share] = await db
      .select()
      .from(shares)
      .where(eq(shares.shareToken, token))
      .limit(1);

    if (!share || !share.fileId) {
      return reply
        .status(404)
        .send({ ok: false, message: "Paylaşım bağlantısı geçersiz." });
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return reply
        .status(410)
        .send({
          ok: false,
          message: "Bu paylaşım bağlantısının süresi dolmuş.",
        });
    }

    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, share.fileId))
      .limit(1);
    if (!file || !fs.existsSync(file.storagePath)) {
      return reply
        .status(404)
        .send({ ok: false, message: "Dosya bulunamadı." });
    }

    // İndirme sayısını artır
    await db
      .update(shares)
      .set({ downloadCount: Number(share.downloadCount || 0) + 1 })
      .where(eq(shares.id, share.id));

    const stream = fs.createReadStream(file.storagePath);
    reply.header("Content-Type", file.mimeType || "application/octet-stream");
    reply.header(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.name)}"`,
    );
    return reply.send(stream);
  });

  // ─── 13. POST /api/download/batch-zip (Çoklu Dosya ZIP İndirme) ─────────
  fastify.post<{
    Body: { fileIds?: string[] };
  }>("/api/download/batch-zip", async (request, reply) => {
    const userId = resolveUserId(request);
    const { fileIds } = request.body || {};

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return reply
        .status(400)
        .send({
          ok: false,
          message: "İndirilecek en az bir dosya seçilmelidir.",
        });
    }

    const fileRecords = await db
      .select()
      .from(files)
      .where(and(eq(files.userId, userId), inArray(files.id, fileIds)));

    if (fileRecords.length === 0) {
      return reply
        .status(404)
        .send({ ok: false, message: "Seçili dosyalar bulunamadı." });
    }

    const archive = archiver("zip", { zlib: { level: 6 } });
    reply.header("Content-Type", "application/zip");
    reply.header(
      "Content-Disposition",
      `attachment; filename="xivizley-drive-${new Date().toISOString().slice(0, 10)}.zip"`,
    );

    for (const f of fileRecords) {
      if (fs.existsSync(f.storagePath)) {
        archive.file(f.storagePath, { name: f.name });
      }
    }

    archive.finalize();
    return reply.send(archive);
  });
};
