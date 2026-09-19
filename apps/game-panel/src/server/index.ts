import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import next from "next";
import { ResourceGovernor } from "@xivizley/resource-gov";
import { gamePanelRoutes } from "./panel-routes.js";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "0.0.0.0";

async function bootstrap() {
  // 1. Resource Governor başlat
  const governor = new ResourceGovernor();
  governor.start();

  // 2. Next.js hazırlığı
  const nextApp = next({ dev, dir: process.cwd() });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  // 3. Fastify başlat
  const fastify = Fastify({
    logger: dev
      ? {
          transport: {
            target: "pino-pretty",
            options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
          },
        }
      : true,
  });

  await fastify.register(cors, { origin: true, credentials: true });
  await fastify.register(cookie);

  // Panel API rotaları
  await fastify.register(gamePanelRoutes, { governor });

  // Next.js Catch-all
  fastify.all("/*", async (req, reply) => {
    reply.hijack();
    await handle(req.raw, reply.raw);
  });

  try {
    await fastify.listen({ port, host });
    console.log(`🎮 XIVIZLEY Game Panel çalışıyor: http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error("Game Panel başlatılamadı:", err);
  process.exit(1);
});
