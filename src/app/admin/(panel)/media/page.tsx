import { MediaLibrary } from "@/components/admin/media-library";
import { PageTitle } from "@/components/admin/ui";
import { can } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import { listMedia } from "../../actions/media";

export const metadata = { title: "مكتبة الوسائط" };

export default async function MediaPage() {
  const me = await requireUser("content.view");
  const items = await listMedia();
  return (
    <>
      <PageTitle
        title="مكتبة الوسائط"
        description="الصور والشعارات المستخدمة في الموقع. ارفع الصور هنا ثم اخترها من أي نموذج في اللوحة."
      />
      <MediaLibrary initial={items} canEdit={can(me.role, "content.edit")} />
    </>
  );
}
