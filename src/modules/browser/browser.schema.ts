import { FastifyRequest } from "fastify";
import { z } from "zod";

const LaunchBrowserRequest = z.object({
  logSinkUrl: z.string().optional(),
  proxyUrl: z.string().optional(),
  stealth: z.boolean().optional(),
  userAgent: z.string().optional(),
  sessionContext: z.record(z.any()).optional(),
  extensions: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  dimensions: z
    .object({
      width: z.number(),
      height: z.number(),
    })
    .optional(),
});

const LaunchBrowserResponse = z.object({
  success: z.boolean(),
  browserDetails: z.object({
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
  }),
});

export type LaunchBrowserRequestBody = z.infer<typeof LaunchBrowserRequest>;
export type LaunchBrowserRequest = FastifyRequest<{ Body: LaunchBrowserRequestBody }>;

export const browserSchemas = {
  LaunchBrowserRequest,
  LaunchBrowserResponse,
};

export default browserSchemas;
