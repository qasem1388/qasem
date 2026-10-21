import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultPageToggles, isPathEnabled, optionalPageOf } from "@/content/defaults/pages";
import { getDictionary } from "@/i18n/dictionaries";
import { localizeHref, tr, whatsappUrl } from "@/lib/utils";

describe("i18n helpers", () => {
  it("localises links and text with Arabic fallback", () => {
    assert.equal(localizeHref("/services", "en"), "/en/services");
    assert.equal(localizeHref("/", "ar"), "/ar");
    assert.equal(localizeHref("https://example.sa", "en"), "https://example.sa");
    assert.equal(tr({ ar: "مرحبا", en: "" }, "en"), "مرحبا");
    assert.equal(tr({ ar: "مرحبا", en: "Hello" }, "en"), "Hello");
  });

  it("builds WhatsApp links from digits only", () => {
    assert.match(whatsappUrl("+966 50 000 0000"), /^https:\/\/wa\.me\/966500000000/);
  });

  it("has the same dictionary keys in both languages", () => {
    const keys = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    assert.deepEqual(keys(getDictionary("en")).sort(), keys(getDictionary("ar")).sort());
  });
});

describe("optional sections", () => {
  it("hides links to disabled sections", () => {
    const pages = { ...defaultPageToggles, careers: false };
    assert.equal(optionalPageOf("/careers/accountant"), "careers");
    assert.equal(isPathEnabled("/careers", pages), false);
    assert.equal(isPathEnabled("/en/careers/x", pages), false);
    assert.equal(isPathEnabled("/services", pages), true);
  });
});
