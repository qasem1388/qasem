import { expect, test } from "@playwright/test";
import { E2E_DOMAIN } from "./db";
import { FAKE_PDF, PDF, loginAsAdmin, trackErrors } from "./helpers";

test.describe.configure({ mode: "serial" });

test("contact form validates and saves with a reference number", async ({ page }) => {
  const done = trackErrors(page);
  await page.goto("/en/contact");
  const form = page.locator("main form").first();
  await form.locator('[name="name"]').fill("E2E Tester");
  await form.locator('[name="phone"]').fill("123");
  await form.locator('[name="email"]').fill(`contact@${E2E_DOMAIN}`);
  await form.locator('[name="message"]').fill("short");
  await form.locator('button[type="submit"]').click();
  await expect(page.getByText("Please enter a valid mobile number.").first()).toBeVisible();
  await expect(form.locator('[name="name"]')).toHaveValue("E2E Tester");

  await form.locator('[name="phone"]').fill("0551234567");
  await form.locator('[name="message"]').fill("We would like to discuss a logistics contract.");
  await form.locator('button[type="submit"]').click();
  await expect(page.locator("main")).toContainText(/CM-\d{4}-[0-9A-F]{6}/);
  done();
});

test("quote form rejects spoofed files and accepts a real PDF", async ({ page }) => {
  await page.goto("/ar/quote");
  const form = page.locator("main form").first();
  await form.locator('[name="name"]').fill("مختبر آلي");
  await form.locator('[name="phone"]').fill("0551234567");
  await form.locator('[name="email"]').fill(`quote@${E2E_DOMAIN}`);
  await form.locator('[name="service"]').selectOption({ index: 1 });
  await form.locator('[name="details"]').fill("نحتاج عرض سعر لتوريد معدات مكتبية.");
  await form.locator('[name="attachment"]').setInputFiles(FAKE_PDF);
  await form.locator('button[type="submit"]').click();
  await expect(page.getByText("الملف غير مقبول").first()).toBeVisible();

  const retry = page.locator("main form").first();
  await retry.locator('[name="attachment"]').setInputFiles(PDF);
  await retry.locator('button[type="submit"]').click();
  await expect(page.locator("main")).toContainText(/RQ-\d{4}-[0-9A-F]{6}/);
});

test("job application requires a CV", async ({ page }) => {
  await page.goto("/en/careers");
  const job = page.locator('main a[href^="/en/careers/"]').first();
  await job.click();
  const form = page.locator("main form").first();
  await form.locator('[name="name"]').fill("E2E Applicant");
  await form.locator('[name="phone"]').fill("0551234567");
  await form.locator('[name="email"]').fill(`jobs@${E2E_DOMAIN}`);
  await form.locator('button[type="submit"]').click();
  await expect(page.getByText("Please attach your CV.").first()).toBeVisible();
  await page.locator("main form").first().locator('[name="cv"]').setInputFiles(PDF);
  await page.locator("main form").first().locator('button[type="submit"]').click();
  await expect(page.locator("main")).toContainText(/JA-\d{4}-[0-9A-F]{6}/);
});

test("forms are rate limited per visitor", async ({ page }) => {
  // The contact test above used one of the five allowed submissions.
  let limited = false;
  for (let i = 0; i < 6 && !limited; i++) {
    await page.goto("/en/contact");
    const form = page.locator("main form").first();
    await form.locator('[name="name"]').fill("Rate Limit");
    await form.locator('[name="phone"]').fill("0551234567");
    await form.locator('[name="email"]').fill(`rate@${E2E_DOMAIN}`);
    await form.locator('[name="message"]').fill("Checking that repeated submissions are throttled.");
    await form.locator('button[type="submit"]').click();
    await expect(
      page
        .locator("main")
        .getByText(/CM-\d{4}|Too many attempts/)
        .first(),
    ).toBeVisible();
    limited = await page.getByText("Too many attempts").isVisible();
  }
  expect(limited).toBe(true);
});

test("submissions reach the admin inboxes", async ({ page }) => {
  await loginAsAdmin(page);
  for (const box of ["messages", "quotes", "applications"]) {
    await page.goto(`/admin/${box}?q=${E2E_DOMAIN}`);
    await expect(page.locator("main"), box).toContainText(/(CM|RQ|JA)-\d{4}-[0-9A-F]{6}/);
  }
});
