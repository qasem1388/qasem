import { notFound } from "next/navigation";
import { DeleteUserForm, EditUserForm, ResetPasswordForm } from "@/components/admin/user-forms";
import { Card, PageTitle } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { roleLabels } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";

export const metadata = { title: "تعديل مستخدم" };

export default async function EditUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const me = await requireUser("users.manage");
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) notFound();
  const isSelf = user.id === me.id;
  const roles = Object.entries(roleLabels).map(([value, label]) => ({ value, label }));

  return (
    <>
      <PageTitle title={user.name} description={user.email} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="بيانات الحساب" className="lg:col-span-2">
          <EditUserForm
            user={{ id: user.id, name: user.name, role: user.role, active: user.active }}
            roles={roles}
            isSelf={isSelf}
          />
        </Card>
        <div className="space-y-6">
          {!isSelf && (
            <Card title="إعادة تعيين كلمة المرور">
              <ResetPasswordForm userId={user.id} />
            </Card>
          )}
          {!isSelf && (
            <Card title="حذف المستخدم">
              <DeleteUserForm userId={user.id} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
