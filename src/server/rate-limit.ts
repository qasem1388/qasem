import "server-only";
import { db } from "@/lib/db";

/**
 * Fixed-window limiter backed by PostgreSQL, so limits hold across restarts and
 * multiple instances. A single atomic upsert counts the hit; returns false once
 * `limit` is exceeded within the window.
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  // Timestamps are passed in (not now()) because the column has no time zone.
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  // Occasionally drop expired windows to keep the table small.
  if (Math.random() < 0.05) await db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
  return (rows[0]?.count ?? 0) <= limit;
}
