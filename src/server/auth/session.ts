import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { requestInfo } from "../request";
import { can, type Permission } from "./permissions";

export const SESSION_COOKIE = "riyada_admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const REFRESH_WHEN_LEFT_MS = 6 * 60 * 60 * 1000;

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

async function setCookie(token: string, expires: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    expires,
  });
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const { ip, userAgent } = await requestInfo();
  await db.session.create({ data: { id: sha256(token), userId, expiresAt, ip, userAgent } });
  await setCookie(token, expiresAt);
  // Opportunistic cleanup of expired sessions.
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete({ name: SESSION_COOKIE, path: "/admin" });
}

/** Current session + user, validated against the database. Cached per request. */
export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    include: { user: { select: { id: true, name: true, email: true, role: true, active: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;

  // Sliding expiry: extend active sessions (cookies can only be written in actions/route handlers).
  if (session.expiresAt.getTime() - Date.now() < REFRESH_WHEN_LEFT_MS) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.session.update({ where: { id: session.id }, data: { expiresAt } });
    try {
      await setCookie(token, expiresAt);
    } catch {
      /* rendering phase: the cookie is refreshed on the next action */
    }
  }
  return { id: session.id, user: session.user };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"];

/** Use in every admin page and server action. Redirects when unauthenticated or unauthorised. */
export async function requireUser(permission: Permission = "dashboard.view"): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!can(session.user.role, permission)) redirect("/admin/forbidden");
  return session.user;
}
