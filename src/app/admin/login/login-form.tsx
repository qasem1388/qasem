"use client";

import { LockKeyhole } from "lucide-react";
import { useActionState } from "react";
import { login } from "../actions/auth";
import { FormMessage, Input, SubmitButton } from "@/components/admin/fields";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      <Input name="email" label="البريد الإلكتروني" type="email" autoComplete="username" required dir="ltr" />
      <Input name="password" label="كلمة المرور" type="password" autoComplete="current-password" required dir="ltr" />
      <FormMessage state={state} />
      <SubmitButton className="w-full">
        <LockKeyhole className="size-4" aria-hidden />
        تسجيل الدخول
      </SubmitButton>
    </form>
  );
}
