import type { FastifyPluginAsync } from "fastify";
import {
  getAllVaultItems,
  getVaultItemById,
  createVaultItem,
  updateVaultItem,
  deleteVaultItemById,
  toggleVaultFavorite,
  type VaultItem,
} from "./services/passService.js";
import { generateTotp } from "./crypto/vaultCrypto.js";

interface VaultBody {
  type?: VaultItem["type"];
  title: string;
  username?: string;
  password?: string;
  url?: string;
  totpSecret?: string;
  notes?: string;
  folder?: string;
  isFavorite?: boolean;
}

interface VaultQuery {
  folder?: string;
}

interface VaultParams {
  id: string;
}

export const passRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── 1. GET /api/vault ─────────────────────────────────────────
  fastify.get<{ Querystring: VaultQuery }>("/api/vault", async (request, reply) => {
    try {
      const items = await getAllVaultItems(request.query.folder);
      return reply.send({ ok: true, data: items });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        error: err?.message || "Kasa verileri alınamadı",
      });
    }
  });

  // ─── 2. POST /api/vault ────────────────────────────────────────
  fastify.post<{ Body: VaultBody }>("/api/vault", async (request, reply) => {
    try {
      const body = request.body || ({} as VaultBody);
      if (!body.title || !body.title.trim()) {
        return reply.status(400).send({
          ok: false,
          error: "Başlık zorunludur",
        });
      }

      const newItem = await createVaultItem({
        type: body.type || "login",
        title: body.title.trim(),
        username: body.username,
        password: body.password || "",
        url: body.url,
        totpSecret: body.totpSecret,
        notes: body.notes,
        folder: body.folder || "Genel",
        isFavorite: Boolean(body.isFavorite),
      });

      return reply.status(201).send({ ok: true, data: newItem });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        error: err?.message || "Öğe kaydedilemedi",
      });
    }
  });

  // ─── 3. GET /api/vault/:id ─────────────────────────────────────
  fastify.get<{ Params: VaultParams }>("/api/vault/:id", async (request, reply) => {
    try {
      const item = await getVaultItemById(request.params.id);
      if (!item) {
        return reply.status(404).send({ ok: false, error: "Öğe bulunamadı" });
      }
      return reply.send({ ok: true, data: item });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err?.message });
    }
  });

  // ─── 4. PUT /api/vault/:id ─────────────────────────────────────
  fastify.put<{ Params: VaultParams; Body: Record<string, any> }>("/api/vault/:id", async (request, reply) => {
    try {
      const body = request.body || {};
      const { id } = request.params;

      if (body.toggleFavorite) {
        const isFav = await toggleVaultFavorite(id);
        return reply.send({ ok: true, isFavorite: isFav });
      }

      const updated = await updateVaultItem(id, body);
      if (!updated) {
        return reply.status(404).send({ ok: false, error: "Öğe bulunamadı" });
      }
      return reply.send({ ok: true, data: updated });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err?.message });
    }
  });

  // ─── 5. DELETE /api/vault/:id ──────────────────────────────────
  fastify.delete<{ Params: VaultParams }>("/api/vault/:id", async (request, reply) => {
    try {
      const success = await deleteVaultItemById(request.params.id);
      return reply.send({ ok: success });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err?.message });
    }
  });

  // ─── 6. GET /api/vault/:id/totp ────────────────────────────────
  fastify.get<{ Params: VaultParams }>("/api/vault/:id/totp", async (request, reply) => {
    try {
      const item = await getVaultItemById(request.params.id);
      if (!item || !item.totpSecret) {
        return reply.status(404).send({
          ok: false,
          error: "Bu öğede 2FA anahtarı tanımlı değil",
        });
      }

      const totp = generateTotp(item.totpSecret);
      return reply.send({ ok: true, data: totp });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err?.message });
    }
  });
};
