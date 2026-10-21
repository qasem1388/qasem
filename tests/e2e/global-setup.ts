import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { ADMIN_EMAIL, withDb } from "./db";

/** Creates a throwaway administrator with a random password and resets rate limits. */
export default async function globalSetup() {
  const password = `E2e-${randomBytes(9).toString("base64url")}-7`;
  const exists = await withDb(async (db) => {
    await db.query(`DELETE FROM "RateLimit"`);
    await db.query(`DELETE FROM "LoginAttempt"`);
    return (await db.query(`SELECT 1 FROM "User" WHERE email = $1`, [ADMIN_EMAIL])).rowCount! > 0;
  });
  const args = ["tsx", "scripts/create-admin.ts", "--email", ADMIN_EMAIL, ...(exists ? ["--reset"] : ["--name", "E2E Admin"])];
  execFileSync("npx", args, { env: { ...process.env, ADMIN_PASSWORD: password }, stdio: "pipe" });
  process.env.E2E_ADMIN_PASSWORD = password;
}
