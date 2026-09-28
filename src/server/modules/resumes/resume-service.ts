import type { Db } from "@/server/db";
import { NotFoundError, UserInputError } from "@/server/errors";
import { LLMError, type LLMProvider } from "@/server/llm/types";
import { runStructured } from "@/server/llm/run-structured";
import { buildCvExtractionPrompt, CV_EXTRACTION_PROMPT } from "@/server/prompts/cv-extraction";
import type { FileStorage } from "@/server/storage/file-storage";
import { cleanText, redactContactDetails } from "@/server/modules/parsing/clean-text";
import { ParsedCvSchema, type ParsedCv } from "@/server/modules/parsing/cv-schema";
import { validateCvFile } from "@/server/modules/parsing/file-validation";
import { extractRawText, TextExtractionError } from "@/server/modules/parsing/text-extraction";
import { contentHash } from "@/server/llm/cache";
import type { Prisma } from "@/generated/prisma/client";

export interface ResumeDeps {
  db: Db;
  storage: FileStorage;
  provider: LLMProvider;
  maxUploadBytes: number;
  llmRateLimit: { limit: number; windowMs: number };
}

const MIN_TEXT_LENGTH = 50;

export async function listResumes(db: Db, userId: string) {
  return db.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, originalFilename: true, fileType: true, parseStatus: true, createdAt: true, updatedAt: true },
  });
}

export async function getResume(db: Db, userId: string, resumeId: string) {
  const resume = await db.resume.findFirst({ where: { id: resumeId, userId } });
  if (!resume) throw new NotFoundError("CV");
  return resume;
}

export async function getLatestResume(db: Db, userId: string) {
  return db.resume.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
}

/** Validate, extract, store privately, then parse. Parse failures keep the upload. */
export async function uploadResume(
  deps: ResumeDeps,
  userId: string,
  file: { name: string; size: number; bytes: Buffer },
) {
  const validation = validateCvFile(file, deps.maxUploadBytes);
  if (!validation.ok) throw new UserInputError(validation.error);

  let extractedText: string;
  try {
    extractedText = cleanText(await extractRawText(file.bytes, validation.fileType));
  } catch (error) {
    if (error instanceof TextExtractionError) throw new UserInputError(error.message);
    throw error;
  }
  if (extractedText.length < MIN_TEXT_LENGTH) {
    throw new UserInputError(
      "We could not find enough text in this file. Scanned or image-only CVs are not supported yet; please upload a text-based PDF or DOCX.",
    );
  }

  const originalFilename = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 200);
  const resume = await deps.db.resume.create({
    data: {
      userId,
      originalFilename,
      fileType: validation.fileType,
      storagePath: "",
      fileSize: file.bytes.length,
      contentHash: contentHash(file.bytes),
      extractedText,
      parseStatus: "PENDING",
    },
  });
  const storagePath = `${userId}/${resume.id}.${validation.fileType === "PDF" ? "pdf" : "docx"}`;
  try {
    await deps.storage.save(storagePath, file.bytes);
  } catch (error) {
    await deps.db.resume.delete({ where: { id: resume.id } });
    throw error;
  }
  await deps.db.resume.update({ where: { id: resume.id }, data: { storagePath } });

  return parseResume(deps, userId, resume.id);
}

/** Runs LLM extraction (cached) and stores parsed data plus normalized rows. */
export async function parseResume(deps: ResumeDeps, userId: string, resumeId: string, options: { force?: boolean } = {}) {
  const resume = await getResume(deps.db, userId, resumeId);
  try {
    const { data } = await runStructured(
      {
        userId,
        prompt: CV_EXTRACTION_PROMPT,
        input: redactContactDetails(resume.extractedText),
        buildPrompt: buildCvExtractionPrompt,
        schema: ParsedCvSchema,
        force: options.force,
      },
      { db: deps.db, provider: deps.provider, rateLimit: deps.llmRateLimit },
    );
    await saveParsedData(deps.db, userId, resumeId, data);
  } catch (error) {
    if (!(error instanceof LLMError)) throw error;
    await deps.db.resume.update({
      where: { id: resume.id },
      data: { parseStatus: "FAILED", parseError: error.message },
    });
  }
  return getResume(deps.db, userId, resumeId);
}

/**
 * Saves user-edited (or freshly extracted) CV data. Resume.parsedData is the
 * canonical document; Experience/Education/Skill rows are rebuilt from it.
 */
export async function saveParsedData(db: Db, userId: string, resumeId: string, input: unknown): Promise<ParsedCv> {
  const parsed = ParsedCvSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new UserInputError(`Invalid CV data at ${first.path.join(".") || "root"}: ${first.message}`);
  }
  const cv = parsed.data;
  await getResume(db, userId, resumeId);

  await db.$transaction([
    db.resume.update({
      where: { id: resumeId },
      data: { parsedData: cv as unknown as Prisma.InputJsonValue, parseStatus: "PARSED", parseError: null },
    }),
    db.experience.deleteMany({ where: { resumeId } }),
    db.education.deleteMany({ where: { resumeId } }),
    db.skill.deleteMany({ where: { resumeId } }),
    db.experience.createMany({ data: cv.experience.map((e, position) => ({ ...e, resumeId, position })) }),
    db.education.createMany({ data: cv.education.map((e, position) => ({ ...e, resumeId, position })) }),
    db.skill.createMany({ data: cv.skills.map((s, position) => ({ ...s, resumeId, position })) }),
  ]);
  return cv;
}

export async function readResumeFile(db: Db, storage: FileStorage, userId: string, resumeId: string) {
  const resume = await getResume(db, userId, resumeId);
  if (!resume.storagePath) throw new NotFoundError("CV file");
  return { resume, bytes: await storage.read(resume.storagePath) };
}

export async function deleteResume(db: Db, storage: FileStorage, userId: string, resumeId: string): Promise<void> {
  const resume = await getResume(db, userId, resumeId);
  await db.resume.delete({ where: { id: resume.id } });
  if (resume.storagePath) await storage.remove(resume.storagePath);
}
