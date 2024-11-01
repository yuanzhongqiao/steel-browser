import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyReplyFrom from "@fastify/reply-from";
import { LaunchRequest } from "./selenium.schema";
import { $ref } from "../../plugins/schemas";

async function routes(server: FastifyInstance) {
  server.register(fastifyReplyFrom, {
    base: server.seleniumService.getSeleniumServerUrl(),
  });

  server.all("/selenium/wd/*", { schema: { hide: true } }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url === "/selenium/wd/session" && request.method === "POST") {
      const body = request.body as any;
      if (!body.capabilities) {
        body.capabilities = {};
      }
      if (!body.capabilities.alwaysMatch) {
        body.capabilities.alwaysMatch = {};
      }
      if (!body.capabilities.alwaysMatch["goog:chromeOptions"]) {
        body.capabilities.alwaysMatch["goog:chromeOptions"] = {};
      }
      if (!body.capabilities.alwaysMatch["goog:chromeOptions"].args) {
        body.capabilities.alwaysMatch["goog:chromeOptions"].args = [];
      }
      const chromeArgs = await server.seleniumService.getChromeArgs();
      body.capabilities.alwaysMatch["goog:chromeOptions"].args.push(...chromeArgs);
      request.body = body;

      return reply.from("/session", {
        body,
        rewriteHeaders(headers, request) {
          headers["content-type"] = "application/json; charset=utf-8";
          headers["accept"] = "application/json; charset=utf-8";
          return headers;
        },
        rewriteRequestHeaders(request, headers) {
          headers["content-type"] = "application/json; charset=utf-8";
          headers["accept"] = "application/json; charset=utf-8";
          return headers;
        },
      });
    }
    return reply.from(request.url.replace("/selenium/wd", ""), {
      body: request.body,
      rewriteRequestHeaders(request, headers) {
        headers["content-type"] = "application/json; charset=utf-8";
        headers["accept"] = "application/json; charset=utf-8";
        return headers;
      },
      rewriteHeaders(headers, request) {
        headers["content-type"] = "application/json; charset=utf-8";
        headers["accept"] = "application/json; charset=utf-8";
        return headers;
      },
    });
  });

  server.post(
    "/selenium/launch",
    {
      schema: {
        operationId: "launch-selenium-session",
        description: "Launch a new Selenium session",
        tags: ["selenium"],
        summary: "Launch a new Selenium session",
        body: $ref("LaunchRequest"),
        response: {
          200: $ref("LaunchResponse"),
        },
      },
    },
    async (request: FastifyRequest<{ Body: LaunchRequest }>, reply: FastifyReply) => {
      const options = request.body;
      await server.cdpService.shutdown();
      await server.seleniumService.launch(options);
      reply.send({ success: true });
    },
  );

  server.post(
    "/selenium/close",
    {
      schema: {
        operationId: "close-selenium-session",
        description: "Close the current Selenium session",
        tags: ["selenium"],
        summary: "Close the current Selenium session",
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await server.seleniumService.close();
      if (server.cdpService.isRunning()) {
        await server.cdpService.shutdown();
      }
      await server.cdpService.launch({
        options: { headless: false },
      });
      reply.send({ success: true });
    },
  );
}

export default routes;
