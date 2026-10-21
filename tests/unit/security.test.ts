import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyticsConfig } from "@/lib/analytics";
import { csvCell, toCsv } from "@/lib/csv";
import { sanitizeRichText } from "@/lib/sanitize";
import { brandCssVariables } from "@/lib/theme";
import { validateUpload } from "@/lib/uploads";
import { clientIpFrom } from "@/server/request";
import type { SiteSettings } from "@/types/content";

describe("rich text sanitiser", () => {
  it("strips scripts, event handlers, iframes and javascript: links", () => {
    const out = sanitizeRichText(
      '<p onclick="x()">Hi<script>alert(1)</script></p><iframe src="https://evil"></iframe><a href="javascript:alert(1)">x</a><img src=x onerror=alert(1)>',
    );
    assert.doesNotMatch(out, /script|onclick|onerror|iframe|javascript:/i);
    assert.match(out, /<p>Hi<\/p>/);
  });

  it("keeps allowed formatting", () => {
    const out = sanitizeRichText(
      '<h2>عنوان</h2><p><strong>نص</strong> <a href="https://example.sa">رابط</a></p><ul><li>بند</li></ul>',
    );
    assert.match(out, /<h2>عنوان<\/h2>/);
    assert.match(out, /<strong>نص<\/strong>/);
    assert.match(out, /href="https:\/\/example.sa"/);
    assert.match(out, /<li>بند<\/li>/);
  });
});

describe("CSV export", () => {
  it("neutralises spreadsheet formulas but keeps phone numbers", () => {
    assert.equal(csvCell('=HYPERLINK("http://evil")'), `"'=HYPERLINK(""http://evil"")"`);
    assert.equal(csvCell("@SUM(A1)"), `"'@SUM(A1)"`);
    assert.equal(csvCell("-2+3"), `"'-2+3"`);
    assert.equal(csvCell("+966551234567"), `"+966551234567"`);
    assert.equal(csvCell(null), `""`);
  });

  it("starts with a BOM and uses CRLF rows", () => {
    const out = toCsv(["a", "b"], [["1", "ب"]]);
    assert.ok(out.startsWith("﻿"));
    assert.equal(out.slice(1), '"a","b"\r\n"1","ب"');
  });
});

describe("brand theme", () => {
  it("rejects CSS injection in colours and clamps numbers", () => {
    const css = brandCssVariables({ primary: "red;}body{display:none", radius: 999, fontScale: 5 });
    assert.match(css, /--brand-primary:#0b1f3a/);
    assert.match(css, /--brand-radius:32px/);
    assert.match(css, /--brand-font-scale:1.15/);
    assert.doesNotMatch(css, /display:none/);
  });
});

describe("analytics IDs", () => {
  const withIds = (analytics: object) => ({ seo: { analytics } }) as unknown as SiteSettings;
  it("passes only strictly valid IDs through", () => {
    assert.deepEqual(analyticsConfig(withIds({ ga4Id: "G-ABC1234", plausibleDomain: "example.sa" })), {
      ga4Id: "G-ABC1234",
      plausibleDomain: "example.sa",
    });
    assert.equal(analyticsConfig(withIds({ ga4Id: 'G-1"><script>', plausibleDomain: "x.sa/../evil" })), null);
    assert.equal(analyticsConfig(withIds({})), null);
  });
});

describe("client IP", () => {
  const h = (xff: string, real?: string) => new Headers({ "x-forwarded-for": xff, ...(real ? { "x-real-ip": real } : {}) });
  it("takes the entry added by the trusted proxy, not the client-supplied one", () => {
    delete process.env.TRUSTED_PROXY_HOPS;
    assert.equal(clientIpFrom(h("1.1.1.1, 203.0.113.9")), "203.0.113.9");
    process.env.TRUSTED_PROXY_HOPS = "2";
    assert.equal(clientIpFrom(h("1.1.1.1, 203.0.113.9, 10.0.0.2")), "203.0.113.9");
    process.env.TRUSTED_PROXY_HOPS = "0";
    assert.equal(clientIpFrom(h("203.0.113.9")), "unknown");
    delete process.env.TRUSTED_PROXY_HOPS;
  });
  it("ignores malformed values", () => {
    assert.equal(clientIpFrom(h("<script>")), "unknown");
    assert.equal(clientIpFrom(new Headers({ "x-real-ip": "2001:db8::1" })), "2001:db8::1");
  });
});

describe("upload validation", () => {
  const rules = { maxBytes: 1024, allowed: ["pdf", "png", "svg"] as const };
  const file = (name: string, bytes: number[] | string) =>
    new File([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], name);
  it("accepts a real PDF and cleans the file name", async () => {
    const r = await validateUpload(file("سيرة<>ذاتية.pdf", [0x25, 0x50, 0x44, 0x46, 0x2d]), {
      ...rules,
      allowed: [...rules.allowed],
    });
    assert.ok(r && r !== "invalid");
    assert.equal(r.kind, "pdf");
    assert.equal(r.name, "سيرة__ذاتية.pdf");
  });
  it("rejects spoofed extensions, oversize files and unsafe SVG", async () => {
    const allowed = [...rules.allowed];
    assert.equal(await validateUpload(file("cv.pdf", "MZ\x90\x00 not a pdf"), { ...rules, allowed }), "invalid");
    assert.equal(await validateUpload(file("a.exe", [0x25, 0x50, 0x44, 0x46]), { ...rules, allowed }), "invalid");
    assert.equal(
      await validateUpload(file("big.pdf", [0x25, 0x50, 0x44, 0x46, ...new Array(2000).fill(0)]), { ...rules, allowed }),
      "invalid",
    );
    assert.equal(await validateUpload(file("x.svg", '<svg onload="alert(1)"></svg>'), { ...rules, allowed }), "invalid");
    assert.ok(
      await validateUpload(file("ok.svg", '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>'), {
        ...rules,
        allowed,
      }),
    );
    assert.equal(await validateUpload(null, { ...rules, allowed }), null);
  });
});
