import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ADMIN_COOKIE, createAdminToken } from "@/lib/auth";

const attempts = new Map<string, { count: number; until: number }>();

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const a = attempts.get(ip);
  if (a && a.count >= 5 && a.until > Date.now()) return NextResponse.json({ error: "محاولات كثيرة، حاول بعد 15 دقيقة" }, { status: 429 });

  const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const expectedEmail = process.env.ADMIN_EMAIL ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!expectedEmail || !expectedPassword || !safeEqual(String(email ?? "").toLowerCase(), expectedEmail.toLowerCase()) || !safeEqual(String(password ?? ""), expectedPassword)) {
    attempts.set(ip, { count: (a && a.until > Date.now() ? a.count : 0) + 1, until: Date.now() + 15 * 60000 });
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }
  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createAdminToken(expectedEmail), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
  return res;
}
