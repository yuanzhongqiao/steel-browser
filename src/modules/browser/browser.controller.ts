import { CDPService } from "../../services/cdp.service";
import { FastifyReply, FastifyRequest } from "fastify";
import { getErrors } from "../../utils/errors";
import { LaunchBrowserRequest } from "./browser.schema";
import { BrowserLauncherOptions } from "../../types";
import { SeleniumService } from "../../services/selenium.service";

export const handleLaunchBrowserSession = async (
  browserService: CDPService,
  request: LaunchBrowserRequest,
  reply: FastifyReply,
) => {
  try {
    const { proxyUrl, userAgent, sessionContext, extensions, logSinkUrl, timezone, dimensions } = request.body;

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

    // TODO: region, solveCaptcha, and sessionContext are not directly used in BrowserLauncherOptions
    // Need to handle these separately or extend BrowserLauncherOptions if needed

    await browserService.startNewSession(browserLauncherOptions);
    return reply.send({ success: true });
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
