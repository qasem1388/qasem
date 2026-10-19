import { describe, expect, it } from "vitest";
import { ar } from "./ar";
import { en } from "./en";
import { interpolate, translate } from "./index";

function leafPaths(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "string" ? [`${prefix}${k}`] : leafPaths(v as object, `${prefix}${k}.`),
  );
}

describe("i18n", () => {
  it("translates and interpolates", () => {
    expect(translate("ar", "nav.dashboard")).toBe("لوحة التحكم");
    expect(translate("ar", "dashboard.greeting", { name: "سارة" })).toBe("مرحبًا، سارة");
    expect(interpolate("{a}-{b}", { a: 1 })).toBe("1-{b}");
  });
  it("falls back to Arabic for missing English keys", () => {
    expect(translate("en", "nav.dashboard")).toBe("Dashboard");
    expect(translate("en", "setup.title")).toBe(ar.setup.title);
    expect(translate("ar", "does.not.exist")).toBe("does.not.exist");
  });
  it("English keys are a subset of Arabic keys", () => {
    const arKeys = new Set(leafPaths(ar));
    for (const k of leafPaths(en)) expect(arKeys.has(k), k).toBe(true);
  });
  it("every backend validation code has an Arabic message", () => {
    const codes = [
      "required", "too_long", "invalid_vat_number", "invalid_cr_number", "invalid_phone", "invalid_email",
      "invalid_postal_code", "invalid_building_number", "invalid_month", "invalid_username", "username_taken",
      "password_too_short", "password_weak", "password_contains_username", "password_mismatch",
    ];
    for (const c of codes) expect(translate("ar", `validation.${c}`)).not.toBe(`validation.${c}`);
  });
});
