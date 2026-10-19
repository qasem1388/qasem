import { describe, expect, it } from "vitest";
import { adminSchema, companySchema, isValidPhone, passwordProblem, zodFieldErrors } from "./schemas";

const company = {
  nameAr: "مؤسسة النخبة",
  nameEn: "",
  vatNumber: "310123456700003",
  crNumber: "1010123456",
  phone: "+966 55 123 4567",
  email: "INFO@Nukhba.sa ",
  city: "الرياض",
  district: "",
  street: "",
  buildingNumber: "1234",
  postalCode: "12211",
  fiscalYearStartMonth: 1,
  calendarDisplay: "both" as const,
};

describe("companySchema (mirrors Rust rules)", () => {
  it("normalizes empty optionals to null and lowercases email", () => {
    const r = companySchema.parse(company);
    expect(r.nameEn).toBeNull();
    expect(r.email).toBe("info@nukhba.sa");
  });
  it("reports error codes per field", () => {
    const r = companySchema.safeParse({ ...company, nameAr: " ", vatNumber: "300000000000001", postalCode: "123" });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(zodFieldErrors(r.error)).toEqual({
        nameAr: "required",
        vatNumber: "invalid_vat_number",
        postalCode: "invalid_postal_code",
      });
  });
});

describe("phone", () => {
  it.each(["0551234567", "+966551234567", "00966 55 123 4567", "0112345678"])("accepts %s", (p) =>
    expect(isValidPhone(p)).toBe(true),
  );
  it.each(["12345", "0055123456", "05512345678"])("rejects %s", (p) => expect(isValidPhone(p)).toBe(false));
});

describe("password policy", () => {
  it("matches backend codes", () => {
    expect(passwordProblem("Strong#Pass2026", "admin")).toBeNull();
    expect(passwordProblem("كلمةمرور2026قوية", "admin")).toBeNull();
    expect(passwordProblem("short1", "x")).toBe("password_too_short");
    expect(passwordProblem("onlyletterspassword", "x")).toBe("password_weak");
    expect(passwordProblem("myadmin12345", "admin")).toBe("password_contains_username");
  });
  it("checks confirmation", () => {
    const r = adminSchema.safeParse({ username: "admin", fullName: "مدير", password: "Strong#Pass2026", passwordConfirm: "x" });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error)).toEqual({ passwordConfirm: "password_mismatch" });
  });
  it("rejects non-latin usernames", () => {
    const r = adminSchema.safeParse({ username: "مدير", fullName: "مدير", password: "Strong#Pass2026", passwordConfirm: "Strong#Pass2026" });
    expect(r.success).toBe(false);
  });
});
