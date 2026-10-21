"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { IMAGE_RULES, validateUpload } from "@/lib/uploads";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/session";
import { publicUrl, storage } from "@/server/storage";

export type MediaItem = { id: string; url: string; name: string; size: number; kind: string; createdAt: string };

export type UploadResult = { ok: true; items: MediaItem[]; rejected: string[] } | { ok: false; message: string };

const toItem = (f: {
  id: string;
  key: string;
  originalName: string;
  size: number;
  kind: string;
  createdAt: Date;
}): MediaItem => ({
  id: f.id,
  url: publicUrl(f.key),
  name: f.originalName,
  size: f.size,
  kind: f.kind,
  createdAt: f.createdAt.toISOString(),
});

/** Uploads one or more images to the public media library. */
export async function uploadMedia(formData: FormData): Promise<UploadResult> {
  const me = await requireUser("content.edit");
  const files = formData.getAll("files");
  if (!files.length) return { ok: false, message: "لم يتم اختيار أي ملف." };
  if (files.length > 20) return { ok: false, message: "الحد الأقصى 20 ملفًا في المرة الواحدة." };

  const items: MediaItem[] = [];
  const rejected: string[] = [];
  for (const entry of files) {
    const file = await validateUpload(entry, IMAGE_RULES);
    if (!file || file === "invalid") {
      rejected.push(typeof entry === "string" ? entry : entry.name);
      continue;
    }
    const now = new Date();
    const key = `images/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${randomBytes(10).toString("hex")}.${file.kind}`;
    await storage.put(key, file.bytes);
    const row = await db.storedFile.create({
      data: { key, originalName: file.name, kind: file.kind, size: file.size, private: false },
    });
    items.push(toItem(row));
  }
  if (items.length) {
    await audit("media.uploaded", {
      userId: me.id,
      entity: "media",
      details: { count: items.length, names: items.map((i) => i.name) },
    });
    revalidatePath("/admin/media");
  }
  return { ok: true, items, rejected };
}

export async function listMedia(): Promise<MediaItem[]> {
  await requireUser("content.view");
  const rows = await db.storedFile.findMany({ where: { private: false }, orderBy: { createdAt: "desc" }, take: 200 });
  return rows.map(toItem);
}

export async function deleteMedia(id: string): Promise<{ ok: boolean; message: string }> {
  const me = await requireUser("content.edit");
  const file = await db.storedFile.findUnique({ where: { id } });
  if (!file || file.private) return { ok: false, message: "الملف غير موجود." };
  await db.storedFile.delete({ where: { id } });
  await storage.remove(file.key);
  await audit("media.deleted", { userId: me.id, entity: "media", entityId: id, details: { name: file.originalName } });
  revalidatePath("/admin/media");
  return { ok: true, message: "تم حذف الملف." };
}
