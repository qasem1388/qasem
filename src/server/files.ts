import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { ValidatedFile } from "@/lib/uploads";
import { storage } from "./storage";

/** Stores a validated upload as a private file (never served publicly) and records it. */
export async function storePrivateFile(file: ValidatedFile, folder: "cv" | "attachments") {
  const now = new Date();
  const key = `private/${folder}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${randomBytes(12).toString("hex")}.${file.kind}`;
  await storage.put(key, file.bytes);
  return db.storedFile.create({ data: { key, originalName: file.name, kind: file.kind, size: file.size, private: true } });
}

export async function deleteStoredFile(id: string | null | undefined) {
  if (!id) return;
  const file = await db.storedFile.findUnique({ where: { id } });
  if (!file) return;
  await db.storedFile.delete({ where: { id } });
  await storage.remove(file.key);
}
