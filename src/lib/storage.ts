import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");

/** يحفظ الملف ويعيد الرابط العام /uploads/... (يُخدم عبر app/uploads/[...path]/route.ts) */
export async function saveUpload(buffer: Buffer, ext: string, folder = "products"): Promise<string> {
  const dir = path.join(UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext.replace(/^\./, "")}`;
  await writeFile(path.join(dir, name), buffer);
  return `/uploads/${folder}/${name}`;
}

export function uploadPathFromUrl(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;
  const rel = url.slice("/uploads/".length);
  const full = path.resolve(UPLOAD_DIR, rel);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) return null;
  return full;
}
