import { db } from "@/lib/db";
import { contentTypes, type UploadKind } from "@/lib/uploads";
import { isValidKey, storage } from "@/server/storage";

/**
 * Serves public uploaded files (images from the media library).
 * Private files (CVs, quote attachments) are never served here.
 */
export async function GET(_req: Request, ctx: RouteContext<"/uploads/[...key]">) {
  const key = (await ctx.params).key.join("/");
  if (!isValidKey(key)) return new Response("Not found", { status: 404 });

  const file = await db.storedFile.findUnique({ where: { key } });
  if (!file || file.private) return new Response("Not found", { status: 404 });
  const bytes = await storage.get(key);
  if (!bytes) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": contentTypes[file.kind as UploadKind] ?? "application/octet-stream",
      "Content-Length": String(bytes.byteLength),
      // Keys are random and never reused, so files can be cached forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // Neutralises any active content if an image is opened directly.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
