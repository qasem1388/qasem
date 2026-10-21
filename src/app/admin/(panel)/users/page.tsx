import { Plus } from "lucide-react";
import Link from "next/link";
import { Badge, PageTitle, Table, Td } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { db } from "@/lib/db";
import { roleDescriptions, roleLabels } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";

export const metadata = { title: "المستخدمون والصلاحيات" };

const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium", timeStyle: "short" });
const roleTone = { ADMIN: "gold", EDITOR: "blue", VIEWER: "gray" } as const;

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireUser("users.manage");
  const { created, deleted } = await searchParams;
  const users = await db.user.findMany({ orderBy: [{ role: "asc" }, { createdAt: "asc" }] });

  return (
    <>
      <PageTitle
        title="المستخدمون والصلاحيات"
        description="إدارة حسابات فريق العمل وأدوارهم في لوحة التحكم."
        actions={
          <Link href="/admin/users/new" className={buttonClasses("secondary", "md")}>
            <Plus className="size-4" aria-hidden />
            مستخدم جديد
          </Link>
        }
      />
      {(created || deleted) && (
        <p role="status" className="rounded-brand mb-4 bg-emerald-50 p-3 text-sm text-emerald-800">
          {created ? "تم إنشاء المستخدم بنجاح." : "تم حذف المستخدم."}
        </p>
      )}
      <Table head={["الاسم", "البريد الإلكتروني", "الدور", "الحالة", "آخر دخول", ""]}>
        {users.map((u) => (
          <tr key={u.id}>
            <Td className="text-primary font-semibold">
              {u.name}
              {u.id === me.id && <span className="text-muted ms-2 text-xs font-normal">(أنت)</span>}
            </Td>
            <Td>
              <span dir="ltr">{u.email}</span>
            </Td>
            <Td>
              <Badge tone={roleTone[u.role]}>{roleLabels[u.role]}</Badge>
            </Td>
            <Td>{u.active ? <Badge tone="green">نشط</Badge> : <Badge tone="red">موقوف</Badge>}</Td>
            <Td className="text-muted">{u.lastLoginAt ? fmt.format(u.lastLoginAt) : "—"}</Td>
            <Td>
              <Link href={`/admin/users/${u.id}`} className="text-accent font-semibold hover:underline">
                تعديل
              </Link>
            </Td>
          </tr>
        ))}
      </Table>

      <h2 className="text-primary mt-10 mb-4 text-lg font-bold">الأدوار والصلاحيات</h2>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(Object.keys(roleLabels) as (keyof typeof roleLabels)[]).map((r) => (
          <li key={r} className="rounded-brand-lg border-primary/8 border bg-white p-5">
            <Badge tone={roleTone[r]}>{roleLabels[r]}</Badge>
            <p className="text-muted mt-3 text-sm leading-6">{roleDescriptions[r]}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
