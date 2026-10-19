import { describe, expect, it } from "vitest";
import { MODULES } from "./modules";

describe("module registry", () => {
  it("lists exactly the 18 planned modules with unique keys and paths", () => {
    expect(MODULES).toHaveLength(18);
    expect(new Set(MODULES.map((m) => m.key)).size).toBe(18);
    expect(new Set(MODULES.map((m) => m.path)).size).toBe(18);
  });
  it("planned modules route to the placeholder", () => {
    for (const m of MODULES.filter((m) => m.status === "planned")) expect(m.path).toBe(`/m/${m.key}`);
  });
});
