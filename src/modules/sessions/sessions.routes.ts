import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  handleLaunchBrowserSession,
  handleGetBrowserContext,
  handleExitBrowserSession,
  handleGetSessionDetails,
} from "./sessions.controller";
import { $ref } from "../../plugins/schemas";
import { CreateSessionRequest } from "./sessions.schema";

async function routes(server: FastifyInstance) {
  server.get(
    "/health",
    {
      schema: {
        operationId: "health",
        description: "Check if the server and browser are running",
        tags: ["Health"],
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
    "/sessions",
    {
      schema: {
        operationId: "launch_browser_session",
        description: "Launch a browser session",
        tags: ["Sessions"],
        summary: "Launch a browser session",
        body: $ref("CreateSession"),
        response: {
          200: $ref("CreateSessionResponse"),
        },
      },
    },
    async (request: CreateSessionRequest, reply: FastifyReply) => handleLaunchBrowserSession(server, request, reply),
  );

  server.get(
    "/sessions/:sessionId",
    {
      schema: {
        operationId: "get_session_details",
        description: "Get session details",
        tags: ["Sessions"],
        summary: "Get session details",
      },
    },
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) =>
      handleGetSessionDetails(request, reply),
  );

  server.get(
    "/sessions/:sessionId/context",
    {
      schema: {
        operationId: "get_browser_context",
        description: "Get a browser context",
        tags: ["Sessions"],
        summary: "Get a browser context",
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => handleGetBrowserContext(server.cdpService, request, reply),
  );

  server.post(
    "/sessions/:sessionId/release",
    {
      schema: {
        operationId: "release_browser_session",
        description: "Release a browser session",
        tags: ["Sessions"],
        summary: "Release a browser session",
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) =>
      handleExitBrowserSession(server.cdpService, server.seleniumService, request, reply),
  );

  server.post(
    "/sessions/release",
    {
      schema: {
        operationId: "release_browser_sessions",
        description: "Release browser sessions",
        tags: ["Sessions"],
        summary: "Release browser sessions",
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) =>
      handleExitBrowserSession(server.cdpService, server.seleniumService, request, reply),
  );
}

export default routes;
