"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/admin/actions/account";
import { FormMessage, Input, SubmitButton } from "./fields";

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-5">
      <Input
        name="current"
        label="كلمة المرور الحالية"
        type="password"
        dir="ltr"
        autoComplete="current-password"
        required
        error={state?.errors?.current}
      />
      <Input
        name="password"
        label="كلمة المرور الجديدة"
        type="password"
        dir="ltr"
        autoComplete="new-password"
        required
        hint="12 حرفًا على الأقل، تتضمن حروفًا وأرقامًا."
        error={state?.errors?.password}
      />
      <Input
        name="confirm"
        label="تأكيد كلمة المرور الجديدة"
        type="password"
        dir="ltr"
        autoComplete="new-password"
        required
        error={state?.errors?.confirm}
      />
      <FormMessage state={state} />
      <SubmitButton>تغيير كلمة المرور</SubmitButton>
    </form>
  );
}
