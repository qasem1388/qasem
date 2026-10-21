import { expect, type Page } from "@playwright/test";
import { ADMIN_EMAIL } from "./db";

export const PDF = {
  name: "cv.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n%e2e\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"),
};
export const FAKE_PDF = { name: "invoice.pdf", mimeType: "application/pdf", buffer: Buffer.from("MZ\x90\x00 this is not a pdf") };

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.fill('[name="email"]', ADMIN_EMAIL);
  await page.fill('[name="password"]', process.env.E2E_ADMIN_PASSWORD!);
  await page.click('main button[type="submit"]');
  await page.waitForURL(/\/admin$/);
}

/** Fails the test on uncaught page errors. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return () => expect(errors).toEqual([]);
}

export async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
