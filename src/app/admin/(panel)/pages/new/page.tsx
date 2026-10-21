import { PageEditor } from "@/components/admin/page-editor";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/server/auth/session";

export const metadata = { title: "صفحة جديدة" };

export default async function NewPage() {
  await requireUser("content.edit");
  const empty = { ar: "", en: "" };
  return (
    <>
      <PageTitle title="صفحة جديدة" />
      <PageEditor
        id={null}
        system={false}
        initial={{ title: empty, slug: "", status: "DRAFT", seoDescription: empty, body: empty }}
      />
    </>
  );
}
