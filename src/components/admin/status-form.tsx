"use client";

import { useActionState } from "react";
import { FormMessage, Select, SubmitButton, type ActionState } from "./fields";

/** Status + internal notes form shared by every inbox (messages, quotes, applications). */
export function StatusForm({
  action,
  status,
  notes,
  options,
  canManage,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  status: string;
  notes: string;
  options: { value: string; label: string }[];
  canManage: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <fieldset disabled={!canManage} className="space-y-4">
        <Select name="status" label="الحالة" defaultValue={status} options={options} />
        <div>
          <label htmlFor="a-notes" className="text-primary mb-1.5 block text-sm font-semibold">
            ملاحظات داخلية
          </label>
          <textarea
            id="a-notes"
            name="notes"
            rows={5}
            defaultValue={notes}
            className="rounded-brand border-primary/15 focus:border-primary focus:ring-secondary/40 block w-full border p-3 text-sm leading-6 focus:ring-2 focus:outline-none"
          />
          <p className="text-muted mt-1 text-xs">لا تظهر لصاحب الطلب.</p>
        </div>
      </fieldset>
      <FormMessage state={state} />
      {canManage && <SubmitButton>حفظ</SubmitButton>}
    </form>
  );
}
