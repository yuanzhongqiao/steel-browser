import fp from "fastify-plugin";
import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import WebSocket from "ws";

const browserWebSocket: FastifyPluginAsync = async (fastify: FastifyInstance, options: any) => {
  fastify.server.on("upgrade", async (request, socket, head) => {
    if (!fastify.cdpService.isRunning()) {
      fastify.log.info("Launching browser...");
      await fastify.cdpService.launch();
      fastify.log.info("Browser launched successfully");
    }
    fastify.cdpService.proxyWebSocket(request, socket, head);
  });
};

export default fp(browserWebSocket, { name: "browser-websocket" });
