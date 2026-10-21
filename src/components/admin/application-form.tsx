"use client";

import { useActionState } from "react";
import { updateApplication } from "@/app/admin/actions/applications";
import { applicationStatuses } from "@/lib/application-status";
import { FormMessage, Select, SubmitButton } from "./fields";

export function ApplicationStatusForm({
  id,
  status,
  notes,
  canManage,
}: {
  id: string;
  status: string;
  notes: string;
  canManage: boolean;
}) {
  const [state, action] = useActionState(updateApplication.bind(null, id), undefined);
  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={!canManage} className="space-y-4">
        <Select
          name="status"
          label="الحالة"
          defaultValue={status}
          options={Object.entries(applicationStatuses).map(([value, s]) => ({ value, label: s.label }))}
        />
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
          <p className="text-muted mt-1 text-xs">لا تظهر للمتقدم.</p>
        </div>
      </fieldset>
      <FormMessage state={state} />
      {canManage && <SubmitButton>حفظ</SubmitButton>}
    </form>
  );
}
