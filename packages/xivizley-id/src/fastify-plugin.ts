import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type { XivizleyUser } from "@xivizley/types";
import { verifyAccessToken } from "./verify.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: XivizleyUser;
  }
}

export interface WithXivizleyAuthOptions {
  /**
   * Eğer true ise token eksik veya geçersiz olsa bile hata fırlatmaz, request.user undefined kalır.
   * Varsayılan: false (zorunlu auth).
   */
  optional?: boolean;
}

/**
 * Fastify route'ları için Bearer token doğrulama middleware/hook plugin'i.
 */
const authPlugin: FastifyPluginAsync<WithXivizleyAuthOptions> = async (fastify, opts) => {
  fastify.decorateRequest("user", undefined);

  fastify.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
    let token: string | undefined;
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else if ((request as any).cookies?.xivizley_access_token) {
      token = (request as any).cookies.xivizley_access_token;
    } else if ((request.query as any)?.token) {
      token = (request.query as any).token;
    }

    if (!token) {
      if (opts.optional) return;
      return reply.status(401).send({
        ok: false,
        code: "UNAUTHORIZED",
        message: "Authorization başlığı veya oturum çerezi eksik.",
      });
    }

    try {
      const user = await verifyAccessToken(token);
      request.user = user;
    } catch (err: any) {
      if (opts.optional) return;
      return reply.status(401).send({
        ok: false,
        code: "INVALID_TOKEN",
        message: err?.message || "Geçersiz veya süresi dolmuş oturum token'ı.",
      });
    }
  });
};

export const withXivizleyAuth = fp(authPlugin, {
  name: "withXivizleyAuth",
  fastify: "5.x",
});
