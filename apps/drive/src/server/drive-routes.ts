import type { FastifyPluginAsync } from "fastify";
import multipart from "@fastify/multipart";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";
import { eq, and, isNull } from "drizzle-orm";
import { withXivizleyAuth } from "@xivizley/xivizley-id";
import { getDb, files, folders, shares } from "@xivizley/db";

const UPLOAD_DIR = process.env["DRIVE_STORAGE_PATH"] || path.resolve(process.cwd(), ".storage/drive");

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

  // Tüm API rotalarını XIVIZLEY ID ile koru
  await fastify.register(withXivizleyAuth);

  // ─── 1. GET /api/files (Dosya ve Klasörleri Listele) ────────
  fastify.get<{
    Querystring: { folder_id?: string };
  }>("/api/files", async (request, reply) => {
    const userId = request.user!.id;
    const folderId = request.querystring.folder_id || null;

    // Klasörleri getir
    const userFolders = await db
      .select()
      .from(folders)
      .where(
        folderId
          ? and(eq(folders.userId, userId), eq(folders.parentId, folderId))
          : and(eq(folders.userId, userId), isNull(folders.parentId)),
      );

    // Dosyaları getir (çöp kutusunda olmayanlar)
    const userFiles = await db
      .select()
      .from(files)
      .where(
        folderId
          ? and(eq(files.userId, userId), eq(files.folderId, folderId), eq(files.isTrashed, false))
          : and(eq(files.userId, userId), isNull(files.folderId), eq(files.isTrashed, false)),
      );

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
    const userId = request.user!.id;
    const { name, parent_id, color } = request.body || {};

    if (!name || !name.trim()) {
      return reply.status(400).send({ ok: false, message: "Klasör adı zorunludur." });
    }

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
  });

  // ─── 3. POST /api/upload (Yüksek Hızlı Zero-Copy Yükleme) ───
  fastify.post("/api/upload", async (request, reply) => {
    const userId = request.user!.id;
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ ok: false, message: "Yüklenecek dosya bulunamadı." });
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

    // Fastify stream ile sıfır RAM yüküyle diske yaz
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
  });

  // ─── 4. GET /api/download/:id (Zero-Copy Akışla İndir) ──────
  fastify.get<{
    Params: { id: string };
  }>("/api/download/:id", async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params;

    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, userId)))
      .limit(1);

    if (!file || !fs.existsSync(file.storagePath)) {
      return reply.status(404).send({ ok: false, message: "Dosya bulunamadı." });
    }

    reply.header("Content-Type", file.mimeType);
    reply.header("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
    reply.header("Content-Length", file.sizeBytes);

    // Node.js createReadStream -> Sıfır RAM tüketimiyle Fastify'a stream aktar
    const stream = fs.createReadStream(file.storagePath);
    return reply.send(stream);
  });
};
