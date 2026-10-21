import { rm } from "node:fs/promises";
import path from "node:path";
import { ADMIN_EMAIL, E2E_DOMAIN, withDb } from "./db";

/** Removes submissions made by the tests (and their files) and disables the throwaway admin. */
export default async function globalTeardown() {
  await withDb(async (db) => {
    const like = `%@${E2E_DOMAIN}`;
    const files = await db.query<{ id: string; key: string }>(
      `SELECT f.id, f.key FROM "StoredFile" f
         LEFT JOIN "QuoteRequest" q ON q."attachmentId" = f.id
         LEFT JOIN "JobApplication" a ON a."cvId" = f.id
        WHERE q.email LIKE $1 OR a.email LIKE $1`,
      [like],
    );
    for (const t of ["ContactMessage", "QuoteRequest", "JobApplication"])
      await db.query(`DELETE FROM "${t}" WHERE email LIKE $1`, [like]);
    await db.query(`DELETE FROM "EmailLog" WHERE "to" LIKE $1`, [like]).catch(() => {});
    for (const f of files.rows) {
      await db.query(`DELETE FROM "StoredFile" WHERE id = $1`, [f.id]);
      await rm(path.resolve(process.env.STORAGE_DIR || "./storage", f.key), { force: true });
    }
    await db.query(`DELETE FROM "Session" WHERE "userId" IN (SELECT id FROM "User" WHERE email = $1)`, [ADMIN_EMAIL]);
    await db.query(`UPDATE "User" SET active = false WHERE email = $1`, [ADMIN_EMAIL]);
    await db.query(`DELETE FROM "RateLimit"`);
  });
}
