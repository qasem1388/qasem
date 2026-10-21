/**
 * CSV for spreadsheet apps: UTF-8 with BOM so Excel shows Arabic correctly;
 * cells starting with = + - @ are prefixed to prevent formula injection.
 */
export function csvCell(v: unknown) {
  let s = v instanceof Date ? v.toISOString().replace("T", " ").slice(0, 16) : String(v ?? "");
  // Plain numbers such as +966… phones are safe; anything else that could start a formula is neutralised.
  if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d[\d\s]*$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export const toCsv = (head: string[], rows: unknown[][]) =>
  "﻿" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
