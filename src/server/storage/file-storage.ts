import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** Private file storage. The root must never be inside public/. */
export interface FileStorage {
  save(key: string, bytes: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  removePrefix(prefix: string): Promise<void>;
}

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9]+)?$/;

function assertSafeKey(key: string): void {
  const segments = key.split("/");
  if (segments.length === 0 || !segments.every((s) => SAFE_SEGMENT.test(s))) {
    throw new Error(`Unsafe storage key: ${key}`);
  }
}

export class LocalFileStorage implements FileStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
    if (this.root.split(path.sep).includes("public")) {
      throw new Error("Upload directory must not be inside a public directory");
    }
  }

  private resolve(key: string): string {
    assertSafeKey(key);
    return path.join(this.root, key);
  }

  async save(key: string, bytes: Buffer): Promise<void> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    await writeFile(file, bytes, { mode: 0o600 });
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  async remove(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  async removePrefix(prefix: string): Promise<void> {
    await rm(this.resolve(prefix), { recursive: true, force: true });
  }
}
