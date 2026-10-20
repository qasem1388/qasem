import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, defaultLocale, isLocale } from "@/i18n/config";

/**
 * Ensures every public URL carries a locale prefix (/ar or /en).
 * Preference order: saved cookie → default locale (Arabic).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) return;

  const saved = request.cookies.get(LOCALE_COOKIE)?.value ?? "";
  const locale = isLocale(saved) ? saved : defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API, admin, Next internals and any file with an extension.
  matcher: ["/((?!api|admin|_next|.*\\..*).*)"],
};
