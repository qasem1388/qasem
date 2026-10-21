import { expect, test } from "@playwright/test";

test("security headers are sent", async ({ request }) => {
  const res = await request.get("/ar");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("SAMEORIGIN");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("admin responses are not indexed or cached", async ({ request }) => {
  const res = await request.get("/admin/login");
  expect(res.headers()["x-robots-tag"]).toContain("noindex");
  expect(res.headers()["cache-control"]).toContain("no-store");
});

test("private files and exports need a session", async ({ request }) => {
  for (const path of ["/admin/files/anything", "/admin/export/messages"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect([302, 303, 307, 401, 403, 404], path).toContain(res.status());
    expect(await res.text()).not.toContain("%PDF");
  }
});

test("uploads cannot escape the storage folder", async ({ request }) => {
  const res = await request.get("/uploads/..%2F..%2F.env");
  expect(res.status()).toBe(404);
});

test("security.txt is published", async ({ request }) => {
  const body = await (await request.get("/.well-known/security.txt")).text();
  expect(body).toMatch(/^Contact: mailto:/m);
  expect(body).toMatch(/^Expires: /m);
});
