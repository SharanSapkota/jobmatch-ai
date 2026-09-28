import "server-only";
import { prisma } from "@/server/db";
import { getEnv } from "@/server/env";
import { getLLMProvider } from "@/server/llm";
import { LocalFileStorage, type FileStorage } from "@/server/storage/file-storage";
import type { ResumeDeps } from "@/server/modules/resumes/resume-service";

let storage: FileStorage | undefined;

export function getStorage(): FileStorage {
  storage ??= new LocalFileStorage(getEnv().UPLOAD_DIR);
  return storage;
}

export function getResumeDeps(): ResumeDeps {
  const env = getEnv();
  return {
    db: prisma,
    storage: getStorage(),
    provider: getLLMProvider(),
    maxUploadBytes: env.MAX_UPLOAD_BYTES,
    llmRateLimit: { limit: env.LLM_RATE_LIMIT_PER_HOUR, windowMs: 60 * 60 * 1000 },
  };
}
