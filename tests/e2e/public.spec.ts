import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { noHorizontalOverflow, trackErrors } from "./helpers";

const KEY_PAGES = [
  "/ar",
  "/en",
  "/ar/about",
  "/en/services",
  "/ar/projects",
  "/en/media/news",
  "/ar/careers",
  "/en/contact",
  "/ar/quote",
  "/ar/faq",
];

test("root redirects to Arabic by default", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("English pages are LTR and the switcher keeps the path", async ({ page }) => {
  await page.goto("/ar/services");
  await page
    .getByRole("link", { name: /English|التبديل إلى الإنجليزية/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/en\/services$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

for (const path of KEY_PAGES) {
  test(`renders ${path} without errors or overflow`, async ({ page }) => {
    const done = trackErrors(page);
    const res = await page.goto(path, { waitUntil: "networkidle" });
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    await noHorizontalOverflow(page);
    done();
  });
}

test("unknown pages return a localized 404", async ({ page }) => {
  const res = await page.goto("/en/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("mobile menu opens and closes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/ar");
  await page.getByRole("button", { name: "فتح القائمة" }).click();
  const nav = page.getByRole("dialog");
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "خدماتنا" }).first().click();
  await expect(page).toHaveURL(/\/ar\/services$/);
});

test("home pages pass automated accessibility checks", async ({ page }) => {
  for (const path of ["/ar", "/en", "/ar/contact"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(
      violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => v.id),
      path,
    ).toEqual([]);
  }
});

test("SEO endpoints and structured data", async ({ page, request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain('hreflang="x-default"');
  expect(sitemap).toContain("/en/services");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \/admin/);
  await page.goto("/ar");
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld!)).toEqual(expect.arrayContaining([expect.objectContaining({ "@type": "WebSite" })]));
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
});
