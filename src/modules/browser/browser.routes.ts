import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleLaunchBrowserSession, handleGetBrowserContext, handleExitBrowserSession } from "./browser.controller";
import { $ref } from "../../plugins/schemas";
import { LaunchBrowserRequest } from "./browser.schema";

async function routes(server: FastifyInstance) {
  server.get(
    "/health",
    {
      schema: {
        operationId: "health",
        description: "Check if the server and browser are running",
        tags: ["sessions"],
        summary: "Check if the server and browser are running",
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!server.cdpService.isRunning()) {
        return reply.status(503).send({ status: "service_unavailable" });
      }
      return reply.send({ status: "ok" });
    },
  );
  server.post(
    "/launch-browser",
    {
      schema: {
        operationId: "launch-browser-session",
        description: "Launch a browser session",
        tags: ["sessions"],
        summary: "Launch a browser session",
        body: $ref("LaunchBrowserRequest"),
        response: {
          200: $ref("LaunchBrowserResponse"),
        },
      },
    },
    async (request: LaunchBrowserRequest, reply: FastifyReply) =>
      handleLaunchBrowserSession(server.cdpService, request, reply),
  );

  server.get(
    "/context",
    {
      schema: {
        operationId: "get_browser_context",
        description: "Get a browser context",
        tags: ["sessions"],
        summary: "Get a browser context",
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => handleGetBrowserContext(server.cdpService, request, reply),
  );

  server.post(
    "/exit-session",
    {
      schema: {
        operationId: "exit-browser-session",
        description: "Exit a browser session",
        tags: ["sessions"],
        summary: "Exit a browser session",
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) =>
      handleExitBrowserSession(server.cdpService, server.seleniumService, request, reply),
  );
}

export default routes;
