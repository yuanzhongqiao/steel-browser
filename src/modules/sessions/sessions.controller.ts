import { CDPService } from "../../services/cdp.service";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getErrors } from "../../utils/errors";
import { CreateSessionRequest, SessionDetails } from "./sessions.schema";
import { BrowserLauncherOptions } from "../../types";
import { SeleniumService } from "../../services/selenium.service";
import { v4 as uuidv4 } from "uuid";
import { env } from "../../env";

// Currently only running 1 session at a time
const activeSessions = new Map<string, SessionDetails>();

export const handleLaunchBrowserSession = async (
  server: FastifyInstance,
  request: CreateSessionRequest,
  reply: FastifyReply,
) => {
  try {
    const { sessionId, proxyUrl, userAgent, sessionContext, extensions, logSinkUrl, timezone, dimensions, isSelenium } =
      request.body;

    if (activeSessions.size > 0) {
      activeSessions.clear();
      server.seleniumService.close();
    }

    const browserLauncherOptions: BrowserLauncherOptions = {
      options: {
        headless: false,
        args: [userAgent ? `--user-agent=${userAgent}` : undefined].filter(Boolean) as string[],
        proxyUrl,
      },
      cookies: sessionContext?.cookies || [],
      userAgent: sessionContext?.userAgent,
      extensions: extensions || [],
      logSinkUrl,
      timezone: timezone || "US/Pacific",
      dimensions,
    };

    if (isSelenium) {
      await server.cdpService.shutdown();
      await server.seleniumService.launch(browserLauncherOptions);
      const sessionDetails: SessionDetails = {
        id: sessionId,
        createdAt: new Date().toISOString(),
        status: "live",
        duration: 0,
        eventCount: 0,
        timeout: 0,
        creditsUsed: 0,
        // Selenium doesn't have websocketUrl or debugUrl
        websocketUrl: "",
        debugUrl: "",
        sessionViewerUrl: "",
        userAgent:
          sessionContext?.userAgent ||
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        proxy: proxyUrl,
        solveCaptcha: false,
        isSelenium,
      };
      activeSessions.set(sessionId || uuidv4(), sessionDetails);
      reply.send(sessionDetails);
    } else {
      await server.cdpService.startNewSession(browserLauncherOptions);
      const sessionDetails: SessionDetails = {
        id: sessionId,
        createdAt: new Date().toISOString(),
        status: "live",
        duration: 0,
        eventCount: 0,
        timeout: 0,
        creditsUsed: 0,
        websocketUrl: `ws://${env.HOST}/`,
        debugUrl: `http://${env.HOST}/debug`,
        sessionViewerUrl: `http://${env.HOST}`,
        userAgent: server.cdpService.getUserAgent(),
        proxy: proxyUrl,
        solveCaptcha: false,
        isSelenium,
      };
      activeSessions.set(sessionId || uuidv4(), sessionDetails);
      return reply.send(sessionDetails);
    }
  } catch (e: unknown) {
    const error = getErrors(e);
    return reply.code(500).send({ success: false, message: error });
  }
};

export const handleExitBrowserSession = async (
  browserService: CDPService,
  seleniumService: SeleniumService,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    seleniumService.close();
    await browserService.endSession();

    activeSessions.clear();

    reply.send({ success: true });
  } catch (e: unknown) {
    const error = getErrors(e);
    return reply.code(500).send({ success: false, message: error });
  }
};

export const handleGetBrowserContext = async (
  browserService: CDPService,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const context = await browserService.getBrowserState();
  return reply.send(context);
};

export const handleGetSessionDetails = async (
  request: FastifyRequest<{ Params: { sessionId: string } }>,
  reply: FastifyReply,
) => {
  const sessionId = request.params.sessionId;
  return reply.send(activeSessions.get(sessionId));
};
