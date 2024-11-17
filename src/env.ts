import { z } from "zod";
import { config } from "dotenv";

config();

const envSchema = z.object({
  HOST: z.string().optional().default("0.0.0.0:3000"),
  PROXY_URL: z.string().optional(),
  DEFAULT_HEADERS: z
    .string()
    .transform((val) => (val ? JSON.parse(val) : undefined))
    .pipe(z.record(z.string()))
    .optional(),
});

export const env = envSchema.parse(process.env);
