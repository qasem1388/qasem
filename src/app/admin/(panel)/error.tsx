"use client";

import { Card } from "@/components/admin/ui";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : undefined;
  return (
    <Card title="تعذر تحميل هذه الصفحة">
      <p className="text-ink/80 text-sm leading-7">
        حدث خطأ غير متوقع أثناء تنفيذ العملية. حاول مرة أخرى، وإذا تكرر الخطأ راجع سجلات الخادم.
      </p>
      {digest && (
        <p className="text-muted mt-2 text-xs">
          رمز الخطأ: <span dir="ltr">{digest}</span>
        </p>
      )}
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-brand bg-primary hover:bg-primary-900 mt-5 h-10 px-5 text-sm font-semibold text-white"
      >
        إعادة المحاولة
      </button>
    </Card>
  );
}
