import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "تسجيل الدخول", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="grid min-h-screen place-items-center bg-neutral-100 p-4">
      <LoginForm next={next ?? "/admin"} />
    </div>
  );
}
