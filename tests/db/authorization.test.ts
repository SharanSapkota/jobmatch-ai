import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NotFoundError } from "@/server/errors";
import { MockProvider } from "@/server/llm/mock-provider";
import { clearLlmData, deleteAccount } from "@/server/modules/account/account-service";
import { getProfile, updateProfile } from "@/server/modules/profile/profile-service";
import {
  deleteResume,
  getResume,
  listResumes,
  parseResume,
  readResumeFile,
  saveParsedData,
  uploadResume,
  type ResumeDeps,
} from "@/server/modules/resumes/resume-service";
import { LocalFileStorage } from "@/server/storage/file-storage";
import { CANDIDATE_A_CV, CANDIDATE_B_CV } from "../fixtures/candidates";
import { createTestUser, hasTestDb, prisma } from "../helpers/db";
import { makeDocx, makePdf } from "../helpers/make-docs";

const profileInput = {
  headline: "Backend engineer",
  summary: "",
  yearsExperience: 7,
  location: "Helsinki",
  desiredRoles: ["Backend Engineer"],
  preferredLocations: ["Helsinki", "Remote"],
  workMode: "HYBRID",
  salaryExpectation: "",
  workAuthorization: "EU citizen",
  languages: ["Finnish", "English"],
  industries: [],
};

describe.skipIf(!hasTestDb)("user isolation", () => {
  let dir: string;
  let deps: ResumeDeps;
  let userA: { id: string };
  let userB: { id: string };
  let resumeA: { id: string };

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "jm-authz-"));
    deps = {
      db: prisma,
      storage: new LocalFileStorage(dir),
      provider: new MockProvider(),
      maxUploadBytes: 5 * 1024 * 1024,
      llmRateLimit: { limit: 100, windowMs: 3600_000 },
    };
    userA = await createTestUser("alice");
    userB = await createTestUser("bob");
    const bytes = makePdf(CANDIDATE_A_CV);
    resumeA = await uploadResume(deps, userA.id, { name: "a.pdf", size: bytes.length, bytes });
    await updateProfile(prisma, userA.id, profileInput);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("the owner can read their parsed resume", async () => {
    const resume = await getResume(prisma, userA.id, resumeA.id);
    expect(resume.parseStatus).toBe("PARSED");
    expect(await prisma.experience.count({ where: { resumeId: resumeA.id } })).toBe(2);
  });

  it("user B cannot read user A's resume or its file", async () => {
    await expect(getResume(prisma, userB.id, resumeA.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(readResumeFile(prisma, deps.storage, userB.id, resumeA.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await listResumes(prisma, userB.id)).toEqual([]);
  });

  it("user B cannot edit or re-parse user A's resume", async () => {
    const before = await getResume(prisma, userA.id, resumeA.id);
    await expect(saveParsedData(prisma, userB.id, resumeA.id, before.parsedData)).rejects.toBeInstanceOf(NotFoundError);
    await expect(parseResume(deps, userB.id, resumeA.id, { force: true })).rejects.toBeInstanceOf(NotFoundError);
    const after = await getResume(prisma, userA.id, resumeA.id);
    expect(after.updatedAt).toEqual(before.updatedAt);
  });

  it("user B cannot delete user A's resume", async () => {
    await expect(deleteResume(prisma, deps.storage, userB.id, resumeA.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(readResumeFile(prisma, deps.storage, userA.id, resumeA.id)).resolves.toBeTruthy();
  });

  it("profiles are scoped to their owner", async () => {
    expect(await getProfile(prisma, userB.id)).toBeNull();
    await updateProfile(prisma, userB.id, { ...profileInput, headline: "Bob's headline" });
    expect((await getProfile(prisma, userA.id))?.headline).toBe("Backend engineer");
    expect((await getProfile(prisma, userB.id))?.headline).toBe("Bob's headline");
  });

  it("the owner can edit, and edits persist", async () => {
    const resume = await getResume(prisma, userA.id, resumeA.id);
    const cv = resume.parsedData as { summary: string | null };
    await saveParsedData(prisma, userA.id, resumeA.id, { ...cv, summary: "Edited summary" });
    const reloaded = await getResume(prisma, userA.id, resumeA.id);
    expect((reloaded.parsedData as { summary: string }).summary).toBe("Edited summary");
  });

  it("rejects invalid edits", async () => {
    await expect(saveParsedData(prisma, userA.id, resumeA.id, { summary: 5 })).rejects.toThrow(/Invalid CV data/);
  });
});

describe.skipIf(!hasTestDb)("privacy controls", () => {
  it("deleting a CV removes the record, normalized rows and the stored file", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "jm-del-"));
    const storage = new LocalFileStorage(dir);
    const deps: ResumeDeps = { db: prisma, storage, provider: new MockProvider(), maxUploadBytes: 5_000_000, llmRateLimit: { limit: 100, windowMs: 3600_000 } };
    const user = await createTestUser("del");
    const bytes = makeDocx(CANDIDATE_B_CV);
    const resume = await uploadResume(deps, user.id, { name: "b.docx", size: bytes.length, bytes });
    expect(resume.parseStatus).toBe("PARSED");
    await deleteResume(prisma, storage, user.id, resume.id);
    expect(await prisma.resume.findUnique({ where: { id: resume.id } })).toBeNull();
    expect(await prisma.experience.count({ where: { resumeId: resume.id } })).toBe(0);
    await expect(storage.read(resume.storagePath)).rejects.toThrow();
    await rm(dir, { recursive: true, force: true });
  });

  it("deleting an account cascades to all owned data and files", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "jm-acct-"));
    const storage = new LocalFileStorage(dir);
    const deps: ResumeDeps = { db: prisma, storage, provider: new MockProvider(), maxUploadBytes: 5_000_000, llmRateLimit: { limit: 100, windowMs: 3600_000 } };
    const user = await createTestUser("gone");
    const bytes = makePdf(CANDIDATE_A_CV);
    const resume = await uploadResume(deps, user.id, { name: "a.pdf", size: bytes.length, bytes });
    await updateProfile(prisma, user.id, profileInput);
    await deleteAccount(prisma, storage, user.id);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await prisma.resume.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.llmCache.count({ where: { userId: user.id } })).toBe(0);
    await expect(storage.read(resume.storagePath)).rejects.toThrow();
    await rm(dir, { recursive: true, force: true });
  });

  it("clearing LLM data only affects the requesting user", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "jm-clear-"));
    const deps: ResumeDeps = { db: prisma, storage: new LocalFileStorage(dir), provider: new MockProvider(), maxUploadBytes: 5_000_000, llmRateLimit: { limit: 100, windowMs: 3600_000 } };
    const a = await createTestUser("clearA");
    const b = await createTestUser("clearB");
    for (const u of [a, b]) {
      const bytes = makePdf(CANDIDATE_A_CV);
      await uploadResume(deps, u.id, { name: "a.pdf", size: bytes.length, bytes });
    }
    const result = await clearLlmData(prisma, a.id);
    expect(result.cacheEntries).toBe(1);
    expect(await prisma.llmCache.count({ where: { userId: a.id } })).toBe(0);
    expect(await prisma.llmCache.count({ where: { userId: b.id } })).toBe(1);
    // The user's CV data itself is kept.
    expect(await prisma.resume.count({ where: { userId: a.id, parseStatus: "PARSED" } })).toBe(1);
    await rm(dir, { recursive: true, force: true });
  });
});
