import "server-only";
import { headers } from "next/headers";

/** Client IP and user agent of the current request (behind a reverse proxy, trust X-Forwarded-For). */
export async function requestInfo() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const userAgent = (h.get("user-agent") ?? "").slice(0, 300);
  return { ip, userAgent };
}
