import { searchWhere } from "@/components/admin/inbox-toolbar";
import { toCsv as csv } from "@/lib/csv";
import { applicationStatuses } from "@/lib/application-status";
import { db } from "@/lib/db";
import { messageStatuses, quoteStatuses } from "@/lib/inbox-status";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/session";
import type { Localized } from "@/types/content";

/** Exports an inbox (respecting the current filters) as CSV. */
export async function GET(req: Request, ctx: RouteContext<"/admin/export/[type]">) {
  const me = await requireUser("inbox.view");
  const { type } = await ctx.params;
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const where = searchWhere(q);
  let body: string;

  if (type === "messages") {
    const rows = await db.contactMessage.findMany({
      where: { ...where, ...(status && status in messageStatuses ? { status: status as keyof typeof messageStatuses } : {}) },
      orderBy: { createdAt: "desc" },
    });
    body = csv(
      ["الرقم المرجعي", "التاريخ", "الاسم", "الجوال", "البريد", "الرسالة", "الحالة", "ملاحظات"],
      rows.map((r) => [r.reference, r.createdAt, r.name, r.phone, r.email, r.message, messageStatuses[r.status].label, r.notes]),
    );
  } else if (type === "quotes") {
    const service = url.searchParams.get("service") ?? undefined;
    const [rows, services] = await Promise.all([
      db.quoteRequest.findMany({
        where: {
          ...where,
          ...(service ? { serviceSlug: service } : {}),
          ...(status && status in quoteStatuses ? { status: status as keyof typeof quoteStatuses } : {}),
        },
        orderBy: { createdAt: "desc" },
      }),
      db.service.findMany({ select: { slug: true, title: true } }),
    ]);
    const name = (slug: string) => (services.find((s) => s.slug === slug)?.title as Localized | undefined)?.ar ?? slug;
    body = csv(
      ["الرقم المرجعي", "التاريخ", "الاسم", "الجهة", "الجوال", "البريد", "الخدمة", "الاحتياج", "الحالة", "ملاحظات"],
      rows.map((r) => [
        r.reference,
        r.createdAt,
        r.name,
        r.company,
        r.phone,
        r.email,
        name(r.serviceSlug),
        r.details,
        quoteStatuses[r.status].label,
        r.notes,
      ]),
    );
  } else if (type === "applications") {
    const job = url.searchParams.get("job") ?? undefined;
    const rows = await db.jobApplication.findMany({
      where: {
        ...where,
        ...(job ? { jobId: job } : {}),
        ...(status && status in applicationStatuses ? { status: status as keyof typeof applicationStatuses } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { job: { select: { title: true } } },
    });
    body = csv(
      ["الرقم المرجعي", "التاريخ", "الوظيفة", "الاسم", "الجوال", "البريد", "المدينة", "الخبرة", "LinkedIn", "الحالة", "ملاحظات"],
      rows.map((r) => [
        r.reference,
        r.createdAt,
        r.job ? (r.job.title as Localized).ar : "طلب عام",
        r.name,
        r.phone,
        r.email,
        r.city,
        r.experience,
        r.linkedin,
        applicationStatuses[r.status].label,
        r.notes,
      ]),
    );
  } else {
    return new Response("Not found", { status: 404 });
  }

  await audit("inbox.exported", { userId: me.id, entity: type, details: { status, q } });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
