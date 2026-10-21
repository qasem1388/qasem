import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getSession()) redirect("/admin");
  const { next } = await searchParams;

  return (
    <main className="bg-primary relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <div className="bg-pattern absolute inset-0 opacity-40" aria-hidden />
      <div className="bg-accent/40 absolute -top-40 size-[30rem] rounded-full blur-3xl ltr:-right-40 rtl:-left-40" aria-hidden />
      <div className="rounded-brand-lg relative w-full max-w-md bg-white p-8 shadow-2xl sm:p-10">
        <div className="mb-8 text-center">
          <Image src="/brand/logo-mark.svg" alt="" width={56} height={56} className="mx-auto" />
          <h1 className="text-primary mt-4 text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-muted mt-1 text-sm">سجّل الدخول لإدارة محتوى الموقع</p>
        </div>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </main>
  );
}
