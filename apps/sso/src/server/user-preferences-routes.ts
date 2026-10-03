// ============================================================
// XIVIZLEY Suite — User Preferences API Routes (R2 & R6)
// Per-user isolated dashboard configuration & theme storage
// ============================================================

import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { getDb, hubPreferences } from "@xivizley/db";
import { withXivizleyAuth } from "@xivizley/xivizley-id";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_WIDGETS = [
  "hero",
  "recentFiles",
  "stickyNote",
  "sentinel",
  "vault",
  "game",
  "apps",
];

function resolveUserId(request: any): string {
  return request.user?.id || DEFAULT_USER_ID;
}

interface PreferencesBody {
  widgets?: string[];
  theme?: string;
}

export const userPreferencesRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb();

  // Auth desteği
  await fastify.register(withXivizleyAuth, { optional: true });

  // ─── 1. GET /api/user/preferences ─────────────────────────────
  fastify.get("/api/user/preferences", async (request, reply) => {
    try {
      const userId = resolveUserId(request);

      const [pref] = await db
        .select()
        .from(hubPreferences)
        .where(eq(hubPreferences.userId, userId))
        .limit(1);

      if (!pref) {
        return reply.send({
          ok: true,
          data: {
            widgets: DEFAULT_WIDGETS,
            theme: "system",
          },
        });
      }

      let parsedWidgets: string[] = DEFAULT_WIDGETS;
      try {
        parsedWidgets = JSON.parse(pref.widgets);
      } catch {
        parsedWidgets = DEFAULT_WIDGETS;
      }

      return reply.send({
        ok: true,
        data: {
          widgets: parsedWidgets,
          theme: pref.theme || "system",
          updatedAt: pref.updatedAt,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: err?.message || "Kullanıcı tercihleri alınamadı.",
      });
    }
  });

  // ─── 2. PUT /api/user/preferences ─────────────────────────────
  fastify.put<{ Body: PreferencesBody }>("/api/user/preferences", async (request, reply) => {
    try {
      const userId = resolveUserId(request);
      const { widgets, theme } = request.body || {};

      const widgetsString = widgets ? JSON.stringify(widgets) : JSON.stringify(DEFAULT_WIDGETS);
      const themeValue = theme || "system";

      const [saved] = await db
        .insert(hubPreferences)
        .values({
          userId,
          widgets: widgetsString,
          theme: themeValue,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: hubPreferences.userId,
          set: {
            widgets: widgetsString,
            theme: themeValue,
            updatedAt: new Date(),
          },
        })
        .returning();

      let parsedWidgets: string[] = DEFAULT_WIDGETS;
      try {
        parsedWidgets = saved ? JSON.parse(saved.widgets) : (widgets || DEFAULT_WIDGETS);
      } catch {
        parsedWidgets = widgets || DEFAULT_WIDGETS;
      }

      return reply.send({
        ok: true,
        data: {
          widgets: parsedWidgets,
          theme: saved?.theme || themeValue,
          updatedAt: saved?.updatedAt || new Date(),
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: err?.message || "Kullanıcı tercihleri kaydedilemedi.",
      });
    }
  });
};
