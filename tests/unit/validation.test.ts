import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applicationSchema, contactSchema, quoteSchema } from "@/lib/validation";

const contact = {
  name: "محمد العتيبي",
  phone: "0551234567",
  email: "Test@Example.com",
  message: "أرغب في معرفة المزيد عن خدماتكم.",
};

describe("form validation", () => {
  it("accepts a valid contact message and normalises email", () => {
    const r = contactSchema.safeParse(contact);
    assert.ok(r.success);
    assert.equal(r.data.email, "test@example.com");
  });

  it("accepts Saudi and international phone formats", () => {
    for (const phone of ["0551234567", "+966551234567", "966 55 123 4567", "(055) 123-4567", "+447700900123"]) {
      assert.ok(contactSchema.safeParse({ ...contact, phone }).success, phone);
    }
  });

  it("rejects bad phone, email, short name and short message with field codes", () => {
    const r = contactSchema.safeParse({ name: "a", phone: "12", email: "nope", message: "short" });
    assert.ok(!r.success);
    const codes = Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
    assert.deepEqual(codes, { name: "name", phone: "phone", email: "email", message: "message" });
  });

  it("requires a service on quote requests", () => {
    const r = quoteSchema.safeParse({ ...contact, details: contact.message, service: "" });
    assert.ok(!r.success);
    assert.equal(r.error.issues[0].path[0], "service");
  });

  it("only accepts https links on job applications", () => {
    const base = { name: "Sara Ahmed", phone: "0551234567", email: "s@example.com" };
    assert.ok(applicationSchema.safeParse({ ...base, linkedin: "https://linkedin.com/in/sara" }).success);
    assert.ok(applicationSchema.safeParse({ ...base, linkedin: "" }).success);
    for (const linkedin of ["javascript:alert(1)", "http://linkedin.com/in/sara", "linkedin.com"]) {
      assert.ok(!applicationSchema.safeParse({ ...base, linkedin }).success, linkedin);
    }
  });
});
