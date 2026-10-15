import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "admin_session";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET غير مضبوط (16 حرفاً على الأقل)");
  return new TextEncoder().encode(s);
}

export async function createAdminToken(email: string): Promise<string> {
  return new SignJWT({ role: "admin", email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}
