import { CreateUserForm } from "@/components/admin/user-forms";
import { Card, PageTitle } from "@/components/admin/ui";
import { roleLabels } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";

export const metadata = { title: "مستخدم جديد" };

export default async function NewUserPage() {
  await requireUser("users.manage");
  return (
    <>
      <PageTitle
        title="مستخدم جديد"
        description="أنشئ حسابًا لعضو في الفريق وحدد دوره. شارك كلمة المرور المبدئية معه بطريقة آمنة."
      />
      <Card className="max-w-3xl">
        <CreateUserForm roles={Object.entries(roleLabels).map(([value, label]) => ({ value, label }))} />
      </Card>
    </>
  );
}
