"use client";

import { useActionState } from "react";
import { createUser, deleteUser, resetUserPassword, updateUser } from "@/app/admin/actions/users";
import { Checkbox, FormMessage, Input, Select, SubmitButton } from "./fields";

type RoleOption = { value: string; label: string };
const PASSWORD_HINT = "12 حرفًا على الأقل، تتضمن حروفًا وأرقامًا.";

export function CreateUserForm({ roles }: { roles: RoleOption[] }) {
  const [state, action] = useActionState(createUser, undefined);
  return (
    <form action={action} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Input name="name" label="الاسم" required error={state?.errors?.name} />
      <Input
        name="email"
        label="البريد الإلكتروني"
        type="email"
        dir="ltr"
        autoComplete="off"
        required
        error={state?.errors?.email}
      />
      <Select name="role" label="الدور" options={roles} defaultValue="EDITOR" />
      <Input
        name="password"
        label="كلمة المرور المبدئية"
        type="password"
        dir="ltr"
        autoComplete="new-password"
        required
        hint={PASSWORD_HINT}
        error={state?.errors?.password}
      />
      <div className="space-y-4 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton>إنشاء المستخدم</SubmitButton>
      </div>
    </form>
  );
}

export function EditUserForm({
  user,
  roles,
  isSelf,
}: {
  user: { id: string; name: string; role: string; active: boolean };
  roles: RoleOption[];
  isSelf: boolean;
}) {
  const [state, action] = useActionState(updateUser.bind(null, user.id), undefined);
  return (
    <form action={action} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Input name="name" label="الاسم" defaultValue={user.name} required error={state?.errors?.name} />
      <Select
        name="role"
        label="الدور"
        options={roles}
        defaultValue={user.role}
        hint={isSelf ? "لا يمكنك تغيير دورك بنفسك." : undefined}
      />
      <div className="sm:col-span-2">
        <Checkbox name="active" label="الحساب نشط" defaultChecked={user.active} hint="إيقاف الحساب ينهي جميع جلساته فورًا." />
      </div>
      <div className="space-y-4 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton>حفظ التغييرات</SubmitButton>
      </div>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(resetUserPassword.bind(null, userId), undefined);
  return (
    <form action={action} className="space-y-4">
      <Input
        name="password"
        label="كلمة المرور الجديدة"
        type="password"
        dir="ltr"
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        error={state?.errors?.password}
      />
      <FormMessage state={state?.errors ? undefined : state} />
      <SubmitButton variant="outline">تعيين كلمة المرور</SubmitButton>
    </form>
  );
}

export function DeleteUserForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(deleteUser.bind(null, userId), undefined);
  return (
    <form action={action} className="space-y-4">
      <Checkbox name="confirm" label="أؤكد حذف هذا المستخدم نهائيًا" hint="يُحتفظ بسجل عملياته دون ربطه بالحساب." />
      <FormMessage state={state} />
      <button
        type="submit"
        className="rounded-brand inline-flex h-11 items-center bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
      >
        حذف المستخدم
      </button>
    </form>
  );
}
