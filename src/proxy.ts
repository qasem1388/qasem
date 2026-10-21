import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, defaultLocale, isLocale } from "@/i18n/config";

const ADMIN_COOKIE = "riyada_admin";

/**
 * 1. /admin: optimistic redirect to the login page when there is no session cookie.
 *    (Real verification happens on the server in every admin page and action.)
 * 2. Public site: ensure every URL carries a locale prefix (/ar or /en);
 *    preference order is the saved cookie, then the default locale (Arabic).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const isPublicAdmin = pathname === "/admin/login";
    if (!isPublicAdmin && !request.cookies.has(ADMIN_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) return;

  const saved = request.cookies.get(LOCALE_COOKIE)?.value ?? "";
  const locale = isLocale(saved) ? saved : defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API, Next internals and any file with an extension.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
