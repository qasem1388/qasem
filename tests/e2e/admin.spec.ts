import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL } from "./db";
import { loginAsAdmin, trackErrors } from "./helpers";

test("panel requires login", async ({ page }) => {
  await page.goto("/admin/settings/identity");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("wrong password shows a generic error", async ({ page }) => {
  await page.goto("/admin/login");
  await page.fill('[name="email"]', ADMIN_EMAIL);
  await page.fill('[name="password"]', "Not-The-Password-123");
  await page.click('main button[type="submit"]');
  await expect(page.getByText("البريد الإلكتروني أو كلمة المرور غير صحيحة.")).toBeVisible();
});

test("session cookie is HttpOnly and scoped to the panel", async ({ page, context }) => {
  await loginAsAdmin(page);
  const cookie = (await context.cookies()).find((c) => c.name === "riyada_admin");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(cookie?.path).toBe("/admin");
});

test("main admin pages load", async ({ page }) => {
  const done = trackErrors(page);
  await loginAsAdmin(page);
  for (const path of [
    "/admin",
    "/admin/homepage",
    "/admin/pages",
    "/admin/menus",
    "/admin/media",
    "/admin/content/services",
    "/admin/content/projects",
    "/admin/content/news",
    "/admin/content/jobs",
    "/admin/messages",
    "/admin/quotes",
    "/admin/applications",
    "/admin/settings/identity",
    "/admin/settings/company",
    "/admin/settings/general",
    "/admin/settings/notifications",
    "/admin/users",
    "/admin/audit",
  ]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("main h1"), path).toBeVisible();
  }
  done();
});

test("content edited in the panel appears on the site", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await loginAsAdmin(page);
  const question = `سؤال اختبار آلي ${Date.now()}`;
  await page.goto("/admin/content/faqs/new");
  await page.fill('[aria-label="التصنيف (عربي)"]', "عام");
  await page.fill('[aria-label="التصنيف (English)"]', "General");
  await page.fill('[aria-label="السؤال (عربي)"]', question);
  await page.fill('[aria-label="السؤال (English)"]', "Automated test question");
  await page.fill('[aria-label="الإجابة (عربي)"]', "هذه إجابة أنشأها الاختبار الآلي وستُحذف بعده.");
  await page.fill('[aria-label="الإجابة (English)"]', "This answer was created by the automated test.");
  await page.click('button:has-text("حفظ التغييرات")');
  await page.waitForURL(/\/admin\/content\/faqs\/[a-z0-9]+\?created=1/);

  await page.goto("/ar/faq");
  await expect(page.getByText(question)).toBeVisible();
  await page.goto("/en/faq");
  await expect(page.getByText("Automated test question")).toBeVisible();

  await page.goto("/admin/content/faqs");
  await page.getByRole("button", { name: `حذف «${question}»` }).click();
  await expect(page.getByRole("button", { name: `حذف «${question}»` })).toHaveCount(0);
  await page.goto("/ar/faq");
  await expect(page.getByText(question)).toHaveCount(0);
});
