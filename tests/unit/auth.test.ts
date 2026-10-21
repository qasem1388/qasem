import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, passwordProblem, verifyPassword } from "@/server/auth/password";
import { can } from "@/server/auth/permissions";

describe("passwords", () => {
  it("enforces length, letters+digits, common words and email reuse", () => {
    assert.ok(passwordProblem("short1"));
    assert.ok(passwordProblem("onlylettersherexx"));
    assert.ok(passwordProblem("Password-2026-long"));
    assert.ok(passwordProblem("salem-2026-strong", "salem@example.com"));
    assert.equal(passwordProblem("Blue-Harbor-4471-Kite", "owner@example.com"), null);
  });

  it("hashes with Argon2id and verifies", async () => {
    const h = await hashPassword("Blue-Harbor-4471-Kite");
    assert.match(h, /^\$argon2id\$/);
    assert.ok(await verifyPassword(h, "Blue-Harbor-4471-Kite"));
    assert.ok(!(await verifyPassword(h, "wrong-password-1")));
    assert.ok(!(await verifyPassword("not-a-hash", "x")));
  });
});

describe("role permissions", () => {
  it("matches the documented matrix", () => {
    assert.ok(can("ADMIN", "users.manage"));
    assert.ok(can("EDITOR", "content.edit") && can("EDITOR", "inbox.manage"));
    assert.ok(!can("EDITOR", "settings.manage") && !can("EDITOR", "users.manage") && !can("EDITOR", "audit.view"));
    assert.ok(can("VIEWER", "inbox.view") && !can("VIEWER", "content.edit") && !can("VIEWER", "inbox.manage"));
  });
});
