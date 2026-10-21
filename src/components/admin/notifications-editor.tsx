"use client";

import { Send } from "lucide-react";
import { useState, useTransition } from "react";
import { saveNotifications, sendTest } from "@/app/admin/actions/notifications";
import type { NotificationSettings, NotifyKind } from "@/content/defaults/notifications";
import { cn } from "@/lib/utils";
import { SaveBar, Section, Toggle, controlClass, useSave } from "./inputs";

/** "Name <address>" → display name and address shown separately (avoids mixed-direction garbling). */
const fromName = (f: string) => f.match(/^\s*"?([^"<]*?)"?\s*<[^>]+>\s*$/)?.[1] ?? "";
const fromAddress = (f: string) => f.match(/<([^>]+)>/)?.[1] ?? f;

const kinds: { key: NotifyKind; label: string }[] = [
  { key: "contact", label: "رسائل «تواصل معنا»" },
  { key: "quote", label: "طلبات عروض الأسعار" },
  { key: "application", label: "طلبات التوظيف" },
];

export function NotificationsEditor({
  initial,
  smtp,
}: {
  initial: NotificationSettings;
  smtp: { host: string; from: string } | null;
}) {
  const [v, setV] = useState(initial);
  const [drafts, setDrafts] = useState<Record<NotifyKind, string>>(() => ({
    contact: initial.recipients.contact.join("\n"),
    quote: initial.recipients.quote.join("\n"),
    application: initial.recipients.application.join("\n"),
  }));
  const s = useSave(saveNotifications, v);
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState<{ ok: boolean; message: string }>();
  const [testing, start] = useTransition();

  const setRecipients = (k: NotifyKind, text: string) => {
    setDrafts((d) => ({ ...d, [k]: text }));
    const list = text
      .split(/[\s,؛;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    setV((p) => ({ ...p, recipients: { ...p.recipients, [k]: list } }));
  };

  return (
    <div className="space-y-6">
      <Section title="خادم البريد (SMTP)">
        {smtp ? (
          <p className="rounded-brand bg-emerald-50 p-3 text-sm text-emerald-800">
            مُعدّ: <bdi dir="ltr">{smtp.host}</bdi> — المرسل: {fromName(smtp.from)} <bdi dir="ltr">{fromAddress(smtp.from)}</bdi>
          </p>
        ) : (
          <p className="rounded-brand bg-secondary-50 text-secondary-700 p-3 text-sm leading-7">
            لم يتم إعداد خادم البريد بعد، لذلك لن تُرسل أي رسائل (تُحفظ الطلبات في اللوحة بشكل طبيعي). أضف المتغيرات{" "}
            <code dir="ltr">SMTP_HOST</code> و<code dir="ltr">SMTP_PORT</code> و<code dir="ltr">SMTP_USER</code> و
            <code dir="ltr">SMTP_PASS</code> و<code dir="ltr">SMTP_FROM</code> إلى ملف البيئة ثم أعد تشغيل الموقع.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-60 flex-1">
            <span className="text-primary mb-1.5 block text-sm font-semibold">إرسال رسالة اختبار إلى</span>
            <input
              type="email"
              dir="ltr"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@company.sa"
              className={cn(controlClass, "h-10 text-left")}
            />
          </label>
          <button
            type="button"
            disabled={testing || !testTo}
            onClick={() => start(async () => setTestMsg(await sendTest(testTo)))}
            className="rounded-brand bg-primary inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Send className="size-4 rtl:-scale-x-100" aria-hidden />
            {testing ? "جارٍ الإرسال…" : "إرسال"}
          </button>
        </div>
        {testMsg && (
          <p
            role="status"
            className={cn("rounded-brand p-3 text-sm", testMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}
          >
            {testMsg.message}
          </p>
        )}
      </Section>

      <Section title="تفعيل الإشعارات">
        <Toggle
          label="إرسال رسائل البريد"
          hint="إيقافه يوقف تنبيهات الفريق ورسائل التأكيد معًا."
          checked={v.enabled}
          onChange={(enabled) => setV((p) => ({ ...p, enabled }))}
        />
      </Section>

      {kinds.map(({ key, label }) => {
        const errs = Object.entries(s.errors ?? {}).filter(([k]) => k.startsWith(`recipients.${key}`));
        return (
          <Section key={key} title={label}>
            <label className="block">
              <span className="text-primary mb-1.5 block text-sm font-semibold">عناوين الفريق التي تصلها التنبيهات</span>
              <textarea
                dir="ltr"
                rows={3}
                value={drafts[key]}
                onChange={(e) => setRecipients(key, e.target.value)}
                placeholder={"sales@company.sa\nmanager@company.sa"}
                aria-invalid={errs.length ? true : undefined}
                className={cn(controlClass, "py-2 text-left leading-6")}
              />
              <span className="text-muted mt-1 block text-xs">
                عنوان في كل سطر (حتى 10). اتركه فارغًا لعدم إرسال تنبيهات لهذا النوع.
              </span>
              {errs.map(([k, m]) => (
                <span key={k} className="mt-1 block text-xs text-red-600">
                  {m} ({v.recipients[key][Number(k.split(".")[2])] ?? ""})
                </span>
              ))}
            </label>
            <Toggle
              label="إرسال رسالة تأكيد لمرسل الطلب"
              hint="تتضمن الرقم المرجعي، وتُرسل بلغة الصفحة التي أُرسل منها الطلب."
              checked={v.autoReply[key]}
              onChange={(x) => setV((p) => ({ ...p, autoReply: { ...p.autoReply, [key]: x } }))}
            />
          </Section>
        );
      })}
      <SaveBar pending={s.pending} dirty={s.dirty} result={s.result} onSave={s.save} />
    </div>
  );
}
