import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { LocalFileStorage } from "@/server/storage/file-storage";

describe("LocalFileStorage", () => {
  const dirs: string[] = [];
  afterAll(async () => {
    await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })));
  });

  it("stores, reads and removes files", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "jm-storage-"));
    dirs.push(dir);
    const storage = new LocalFileStorage(dir);
    await storage.save("user1/resume1.pdf", Buffer.from("x"));
    expect((await storage.read("user1/resume1.pdf")).toString()).toBe("x");
    await storage.removePrefix("user1");
    await expect(storage.read("user1/resume1.pdf")).rejects.toThrow();
  });

  it("rejects path traversal keys", async () => {
    const storage = new LocalFileStorage(os.tmpdir());
    await expect(storage.read("../etc/passwd")).rejects.toThrow(/Unsafe/);
    await expect(storage.save("a/../../b.pdf", Buffer.from("x"))).rejects.toThrow(/Unsafe/);
  });

  it("refuses a root inside a public directory", () => {
    expect(() => new LocalFileStorage("public/uploads")).toThrow(/public/);
  });
});
