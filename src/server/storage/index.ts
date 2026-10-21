import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Storage abstraction for uploaded files. The default driver writes to the
 * local disk (STORAGE_DIR, default ./storage). Add an S3-compatible driver
 * here for multi-server or serverless hosting — callers only use this interface.
 */
export interface StorageDriver {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  remove(key: string): Promise<void>;
}

const KEY_RE = /^[a-z0-9][a-z0-9/_-]*\.[a-z0-9]{2,5}$/;

export function isValidKey(key: string) {
  return KEY_RE.test(key) && !key.includes("..") && !key.includes("//");
}

class LocalDriver implements StorageDriver {
  // Runtime-configured directory; excluded from build-time file tracing.
  private root = path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR || "./storage");

  private resolve(key: string) {
    if (!isValidKey(key)) throw new Error("Invalid storage key");
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, bytes: Uint8Array) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes, { flag: "wx" });
  }

  async get(key: string) {
    try {
      return new Uint8Array(await readFile(this.resolve(key)));
    } catch {
      return null;
    }
  }

  async remove(key: string) {
    await rm(this.resolve(key), { force: true });
  }
}

export const storage: StorageDriver = new LocalDriver();

/** Public URL of a non-private stored file. */
export const publicUrl = (key: string) => `/uploads/${key}`;
