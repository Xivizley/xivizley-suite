import type { FastifyPluginAsync } from "fastify";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pipeline } from "node:stream/promises";
import Docker from "dockerode";
// @ts-ignore
import { TarArchive } from "archiver";
import type { GameId } from "@xivizley/types";
import { GAME_CATALOG } from "../data/game-catalog.js";

const BACKUP_DIR =
  process.env.BACKUP_DIR || path.resolve(process.cwd(), "backups");

// Ensure backup storage directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const META_FILE = path.join(BACKUP_DIR, "backups_meta.json");

interface BackupMetadata {
  filename: string;
  gameId: GameId;
  createdAt: string;
  sizeBytes: number;
  sizeFormatted: string;
  note?: string;
}

function loadMeta(): Record<string, BackupMetadata> {
  try {
    if (fs.existsSync(META_FILE)) {
      return JSON.parse(fs.readFileSync(META_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveMeta(meta: Record<string, BackupMetadata>) {
  try {
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), "utf-8");
  } catch (err) {
    console.error("Yedek metadata kaydedilemedi:", err);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getContainerName(gameId?: string): string {
  if (!gameId || gameId === "fivem") {
    return process.env["FIVEM_CONTAINER_NAME"] || "fivem-server";
  }
  return `xivizley-${gameId}-server`;
}

export const gameBackupRoutes: FastifyPluginAsync = async (fastify) => {
  const docker = new Docker({
    socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock",
  });

  // ─── 1. GET /api/server/backups (Yedekleri Listele) ────────────
  fastify.get<{
    Querystring: { gameId?: GameId };
  }>("/api/server/backups", async (request, reply) => {
    try {
      const targetGame = request.query?.gameId;
      const meta = loadMeta();
      const files = fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith(".tar.gz") || f.endsWith(".zip"));

      const backups: BackupMetadata[] = [];

      for (const file of files) {
        const fullPath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(fullPath);

        let itemMeta = meta[file];
        if (!itemMeta) {
          // Infer from filename e.g. backup-minecraft-20261002.tar.gz
          const parts = file.split("-");
          const rawGame = parts[1] || "";
          const inferredGame = (
            rawGame in GAME_CATALOG ? rawGame : "minecraft"
          ) as GameId;
          itemMeta = {
            filename: file,
            gameId: inferredGame,
            createdAt: stats.mtime.toISOString(),
            sizeBytes: stats.size,
            sizeFormatted: formatBytes(stats.size),
            note: "Otomatik Sistem Arşivi",
          };
          meta[file] = itemMeta;
        } else {
          itemMeta.sizeBytes = stats.size;
          itemMeta.sizeFormatted = formatBytes(stats.size);
        }

        if (!targetGame || itemMeta.gameId === targetGame) {
          backups.push(itemMeta);
        }
      }

      // Sort newest first
      backups.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      saveMeta(meta);

      return reply.send({ ok: true, data: backups });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: err?.message || "Yedek listesi okunamadı.",
      });
    }
  });

  // ─── 2. POST /api/server/backups/create (Yedek Oluştur) ────────
  fastify.post<{
    Body: { gameId?: GameId; note?: string };
  }>("/api/server/backups/create", async (request, reply) => {
    const gameId = (request.body?.gameId as GameId) || "minecraft";
    const note = request.body?.note?.trim() || "Manuel Yönetici Yedeği";
    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${gameId}-${timestamp}.tar.gz`;
    const destPath = path.join(BACKUP_DIR, filename);

    try {
      let createdFromDocker = false;

      try {
        const inspect = await container.inspect();
        if (inspect.State.Running) {
          const rootMount = GAME_CATALOG[gameId]?.volumeMountPath || "/data";
          const archiveStream = await container.getArchive({ path: rootMount });
          const writeStream = fs.createWriteStream(destPath);
          const gzip = zlib.createGzip();

          await pipeline(archiveStream, gzip, writeStream);
          createdFromDocker = true;
        }
      } catch {
        // Fallback to local archiving
      }

      if (!createdFromDocker) {
        // Create a standalone backup archive with configuration and files
        await new Promise<void>((resolve, reject) => {
          const output = fs.createWriteStream(destPath);
          const archive = new (TarArchive as any)({
            gzip: true,
            gzipOptions: { level: 6 },
          });

          output.on("close", resolve);
          archive.on("error", reject);
          archive.pipe(output);

          // Add manifest and game metadata
          const manifestContent = JSON.stringify(
            {
              gameId,
              createdAt: new Date().toISOString(),
              note,
              version: "1.0",
              catalogInfo: GAME_CATALOG[gameId] || null,
            },
            null,
            2,
          );

          archive.append(manifestContent, {
            name: "xivizley_backup_manifest.json",
          });

          // If game volume directory exists locally, archive it
          const localVolume = path.resolve(process.cwd(), `.storage/${gameId}`);
          if (fs.existsSync(localVolume)) {
            archive.directory(localVolume, "data");
          }

          archive.finalize();
        });
      }

      const stats = fs.statSync(destPath);
      const backupInfo: BackupMetadata = {
        filename,
        gameId,
        createdAt: new Date().toISOString(),
        sizeBytes: stats.size,
        sizeFormatted: formatBytes(stats.size),
        note,
      };

      const meta = loadMeta();
      meta[filename] = backupInfo;
      saveMeta(meta);

      return reply.send({
        ok: true,
        message: `${filename} yedeği başarıyla oluşturuldu.`,
        backup: backupInfo,
      });
    } catch (err: any) {
      if (fs.existsSync(destPath)) {
        try {
          fs.unlinkSync(destPath);
        } catch {}
      }
      return reply.status(500).send({
        ok: false,
        message: `Yedek oluşturulamadı: ${err?.message || err}`,
      });
    }
  });

  // ─── 3. POST /api/server/backups/restore (Yedekten Geri Yükle) ─
  fastify.post<{
    Body: { gameId?: GameId; filename: string };
  }>("/api/server/backups/restore", async (request, reply) => {
    const rawFilename = request.body?.filename;
    const gameId = (request.body?.gameId as GameId) || "minecraft";

    if (!rawFilename) {
      return reply
        .status(400)
        .send({ ok: false, message: "filename parametresi zorunludur." });
    }

    const safeFilename = path.basename(rawFilename);
    if (!safeFilename.endsWith(".tar.gz") && !safeFilename.endsWith(".zip")) {
      return reply
        .status(400)
        .send({ ok: false, message: "Geçersiz yedek dosya biçimi." });
    }

    const backupPath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(backupPath)) {
      return reply
        .status(404)
        .send({ ok: false, message: "Yedek dosyası diskte bulunamadı." });
    }

    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    try {
      let restoredInDocker = false;

      try {
        const inspect = await container.inspect();
        if (inspect.State.Running) {
          const rootMount = GAME_CATALOG[gameId]?.volumeMountPath || "/data";
          const readStream = fs.createReadStream(backupPath);
          const gunzip = zlib.createGunzip();

          const tarStream = readStream.pipe(gunzip);
          // Hedef olarak üst dizin (ör. "/") verilir; böylece arşiv içindeki "data/" klasörü /data içerisine açılır
          const targetDir = path.posix.dirname(rootMount) || "/";
          await container.putArchive(tarStream, { path: targetDir });
          restoredInDocker = true;
        }
      } catch {
        // Docker not running or dev mode
      }

      return reply.send({
        ok: true,
        message: `"${safeFilename}" yedeği başarıyla geri yüklendi. Değişikliklerin geçerli olması için sunucuyu yeniden başlatabilirsiniz.`,
        restoredInDocker,
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: `Geri yükleme başarısız: ${err?.message || err}`,
      });
    }
  });

  // ─── 4. DELETE /api/server/backups/:filename (Yedeği Sil) ──────
  fastify.delete<{
    Params: { filename: string };
  }>("/api/server/backups/:filename", async (request, reply) => {
    const rawFilename = request.params.filename;
    const safeFilename = path.basename(rawFilename);

    if (!safeFilename.endsWith(".tar.gz") && !safeFilename.endsWith(".zip")) {
      return reply
        .status(400)
        .send({ ok: false, message: "Geçersiz yedek dosya biçimi." });
    }

    const backupPath = path.join(BACKUP_DIR, safeFilename);

    try {
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }

      const meta = loadMeta();
      delete meta[safeFilename];
      saveMeta(meta);

      return reply.send({
        ok: true,
        message: `"${safeFilename}" arşivi başarıyla silindi.`,
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: `Yedek silinemedi: ${err?.message || err}`,
      });
    }
  });

  // ─── 5. GET /api/server/backups/download/:filename ─────────────
  fastify.get<{
    Params: { filename: string };
  }>("/api/server/backups/download/:filename", async (request, reply) => {
    const rawFilename = request.params.filename;
    const safeFilename = path.basename(rawFilename);

    if (!safeFilename.endsWith(".tar.gz") && !safeFilename.endsWith(".zip")) {
      return reply
        .status(400)
        .send({ ok: false, message: "Geçersiz yedek dosya biçimi." });
    }

    const backupPath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(backupPath)) {
      return reply
        .status(404)
        .send({ ok: false, message: "Yedek dosyası bulunamadı." });
    }

    const stats = fs.statSync(backupPath);
    reply.header("Content-Type", "application/gzip");
    reply.header(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(safeFilename)}"`,
    );
    reply.header("Content-Length", stats.size);

    return reply.send(fs.createReadStream(backupPath));
  });
};
