import "dotenv/config";
import { Client } from "pg";

export const E2E_DOMAIN = "e2e.example.com";
export const ADMIN_EMAIL = `admin@${E2E_DOMAIN}`;

export async function withDb<T>(fn: (db: Client) => Promise<T>) {
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("schema");
  const db = new Client({ connectionString: url.toString() });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}
