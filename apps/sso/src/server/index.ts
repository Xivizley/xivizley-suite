import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import next from "next";
import { authRoutes } from "./auth-routes.js";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

async function bootstrap() {
  const nextApp = next({ dev, dir: process.cwd() });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  const fastify = Fastify({
    logger: dev
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
        }
      : true,
  });

  // Middleware eklentileri
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || "xivizley_cookie_secret_key_32_chars_min",
  });

  // 1. Auth API rotaları (Fastify tarafından doğrudan işlenir)
  await fastify.register(authRoutes);

  // 2. Next.js SSR ve App Router sayfaları için catch-all yönlendirme
  fastify.all("/*", async (req, reply) => {
    reply.hijack();
    await handle(req.raw, reply.raw);
  });

  // Sunucuyu başlat
  try {
    await fastify.listen({ port, host });
    console.log(`🚀 XIVIZLEY SSO & ID Servisi çalışıyor: http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error("SSO başlatılamadı:", err);
  process.exit(1);
});
