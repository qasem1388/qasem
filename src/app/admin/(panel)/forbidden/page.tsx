import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export const metadata = { title: "غير مصرح" };

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <ShieldAlert className="size-14 text-red-500" aria-hidden />
      <h1 className="text-primary mt-5 text-2xl font-bold">لا تملك صلاحية الوصول</h1>
      <p className="text-muted mt-2 max-w-md">
        هذه الصفحة غير متاحة لدورك الحالي. تواصل مع مدير النظام إذا كنت تحتاج هذه الصلاحية.
      </p>
      <Link href="/admin" className={buttonClasses("secondary", "md", "mt-8")}>
        العودة للرئيسية
      </Link>
    </div>
  );
}
