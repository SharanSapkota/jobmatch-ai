import type { Db } from "@/server/db";
import type { FileStorage } from "@/server/storage/file-storage";

/** Deletes the user and, via cascades, every row they own; then their files. */
export async function deleteAccount(db: Db, storage: FileStorage, userId: string): Promise<void> {
  await db.user.delete({ where: { id: userId } });
  await storage.removePrefix(userId);
}

/**
 * Clears LLM-generated analysis: cached model outputs, job matches, CV
 * recommendations and tailored CVs. The user's own CV data (which they may have
 * edited) is kept; it can be deleted separately from My CV.
 */
export async function clearLlmData(db: Db, userId: string) {
  const [cache, matches, recommendations, tailored] = await db.$transaction([
    db.llmCache.deleteMany({ where: { userId } }),
    db.jobMatch.deleteMany({ where: { userId } }),
    db.cVRecommendation.deleteMany({ where: { userId } }),
    db.tailoredResume.deleteMany({ where: { userId } }),
  ]);
  return {
    cacheEntries: cache.count,
    matches: matches.count,
    recommendations: recommendations.count,
    tailoredResumes: tailored.count,
  };
}
