import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center p-8 text-center">
      <div>
        <p className="text-7xl font-black">404</p>
        <p className="my-4 text-neutral-500">الصفحة غير موجودة أو تم نقلها</p>
        <Link href="/" className="btn-primary">العودة للرئيسية</Link>
      </div>
    </div>
  );
}
