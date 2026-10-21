import "server-only";
import { headers } from "next/headers";

/**
 * Number of reverse proxies in front of the app (TRUSTED_PROXY_HOPS, default 1).
 * Each proxy appends the address it received the request from to X-Forwarded-For,
 * so the client is the Nth entry from the right; anything further left is
 * client-supplied and can be forged.
 */
function trustedHops() {
  const n = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  return Number.isInteger(n) && n >= 0 ? n : 1;
}

export function clientIpFrom(h: Headers) {
  const hops = trustedHops();
  if (hops > 0) {
    const chain = (h.get("x-forwarded-for") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ip = chain[chain.length - hops] ?? h.get("x-real-ip")?.trim();
    if (ip && /^[0-9a-fA-F:.]{2,45}$/.test(ip)) return ip;
  }
  return "unknown";
}

/** Client IP and user agent of the current request. */
export async function requestInfo() {
  const h = await headers();
  return { ip: clientIpFrom(h), userAgent: (h.get("user-agent") ?? "").slice(0, 300) };
}
