import { describe, expect, it } from "vitest";
import { formatAmount, formatDate, formatDateTime, parseIsoDate, splitAmount, todayIso } from "./format";

describe("formatAmount", () => {
  it("formats exact decimal strings with two places", () => {
    expect(formatAmount("1150")).toBe("1,150.00");
    expect(formatAmount("1234567.5")).toBe("1,234,567.50");
    expect(formatAmount("0.1")).toBe("0.10");
  });
  it("keeps precision beyond float range", () => {
    expect(formatAmount("90071992547409.93")).toBe("90,071,992,547,409.93");
  });
  it("rejects non-numeric input", () => {
    expect(formatAmount("abc")).toBe("—");
    expect(formatAmount("1e5")).toBe("—");
  });
  it("splits whole and fraction", () => {
    expect(splitAmount("-42.5")).toEqual({ whole: "42", fraction: "50", negative: true });
  });
});

describe("dates", () => {
  it("parses ISO calendar dates without timezone drift", () => {
    expect(parseIsoDate("2026-01-31")?.getUTCDate()).toBe(31);
    expect(parseIsoDate("31/01/2026")).toBeNull();
  });
  it("renders Gregorian and Hijri (Umm al-Qura)", () => {
    const g = formatDate("2026-03-20", "gregorian");
    const h = formatDate("2026-03-20", "hijri");
    expect(g).toContain("2026");
    expect(h).toContain("1447"); // 20 Mar 2026 = 1 Shawwal 1447 AH
    expect(formatDate("2026-03-20", "both")).toBe(`${g} — ${h}`);
  });
  it("formats timestamps as fixed numeric layout", () => {
    expect(formatDateTime(new Date(2026, 9, 19, 7, 5).toISOString())).toBe("2026-10-19 07:05");
    expect(formatDateTime("garbage")).toBe("—");
  });
  it("todayIso pads month and day", () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
