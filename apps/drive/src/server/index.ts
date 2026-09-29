import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import next from "next";
import { driveRoutes } from "./drive-routes.js";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3002);
const host = process.env.HOST || "0.0.0.0";

async function bootstrap() {
  let nextReady = false;
  const nextApp = next({ dev, dir: process.cwd() });
  const handle = nextApp.getRequestHandler();

  try {
    await nextApp.prepare();
    nextReady = true;
  } catch (err) {
    console.warn("⚠️ Next.js frontend hazır değil, API modunda çalışılıyor:", err);
  }

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

  // Drive API rotaları
  await fastify.register(driveRoutes);

  // Next.js Catch-all
  fastify.setNotFoundHandler(async (req, reply) => {
    if (nextReady) {
      reply.hijack();
      await handle(req.raw, reply.raw);
    } else {
      reply.status(200).send({
        ok: true,
        service: "XIVIZLEY Drive",
        status: "API operational",
      });
    }
  });

  try {
    await fastify.listen({ port, host });
    console.log(`📁 XIVIZLEY Drive çalışıyor: http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error("Drive başlatılamadı:", err);
  process.exit(1);
});
