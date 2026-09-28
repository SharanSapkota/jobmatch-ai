import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  LLM_PROVIDER: z.enum(["mock", "anthropic"]).optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5"),
  UPLOAD_DIR: z.string().default("storage/uploads"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  LLM_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(20),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= EnvSchema.parse(process.env);
  return cached;
}
