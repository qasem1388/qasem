import { db } from "@/lib/db";
import { contentTypes, type UploadKind } from "@/lib/uploads";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/session";
import { storage } from "@/server/storage";

/** Authenticated download of private files (CVs, quote attachments). Always served as an attachment. */
export async function GET(_req: Request, ctx: RouteContext<"/admin/files/[id]">) {
  const me = await requireUser("inbox.view");
  const { id } = await ctx.params;
  const file = await db.storedFile.findUnique({ where: { id } });
  if (!file?.private) return new Response("Not found", { status: 404 });
  const bytes = await storage.get(file.key);
  if (!bytes) return new Response("Not found", { status: 404 });
  await audit("file.downloaded", { userId: me.id, entity: "file", entityId: id, details: { name: file.originalName } });

  const ascii = file.originalName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": contentTypes[file.kind as UploadKind] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
