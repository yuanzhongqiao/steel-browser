import { FastifyRequest } from "fastify";
import { z } from "zod";

const CreateSession = z.object({
  proxyUrl: z.string().optional(),
  userAgent: z.string().optional(),
  sessionContext: z.record(z.any()).optional(),
  isSelenium: z.boolean().optional(),
  // Specific to steel-browser
  logSinkUrl: z.string().optional(),
  extensions: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  dimensions: z
    .object({
      width: z.number(),
      height: z.number(),
    })
    .optional(),
});

const CreateSessionResponse = z.object({
  id: z.string().uuid().describe("Unique identifier for the session"),
  createdAt: z.string().datetime().describe("Timestamp when the session started"),
  status: z.enum(["live", "released", "failed"]).describe("Status of the session"),
  duration: z.number().int().describe("Duration of the session in milliseconds"),
  eventCount: z.number().int().describe("Number of events processed in the session"),
  timeout: z.number().int().describe("Session timeout duration in milliseconds"),
  creditsUsed: z.number().int().describe("Amount of credits consumed by the session"),
  websocketUrl: z.string().describe("URL for the session's WebSocket connection"),
  debugUrl: z.string().describe("URL for debugging the session"),
  sessionViewerUrl: z.string().describe("URL to view session details"),
  userAgent: z.string().optional().describe("User agent string used in the session"),
  proxy: z.string().optional().describe("Proxy server used for the session"),
  solveCaptcha: z.boolean().optional().describe("Indicates if captcha solving is enabled"),
  isSelenium: z.boolean().optional().describe("Indicates if Selenium is used in the session"),

  // success: z.boolean(),
  // browserDetails: z.object({
  //   userAgent: z.string().optional(),
  //   ipAddress: z.string().optional(),
  // }),
});

export type CreateSessionBody = z.infer<typeof CreateSession>;
export type CreateSessionRequest = FastifyRequest<{ Body: CreateSessionBody }>;

export type SessionDetails = z.infer<typeof CreateSessionResponse>;

const NullableRequest = z.object({}).nullable();

export const browserSchemas = {
  CreateSession,
  CreateSessionResponse,
  NullableRequest,
};

export default browserSchemas;
