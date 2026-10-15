import { AdminNav } from "@/components/admin/AdminNav";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة التحكم", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <div className="min-h-screen bg-neutral-100 lg:flex">
      <AdminNav storeName={s.storeName} />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
