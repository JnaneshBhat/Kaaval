import { describe, it, expect } from "vitest";
import { scanText, redactText } from "../src/privacy/sensitive-data";

describe("privacy guard (heuristic)", () => {
  it("detects email, phone, aadhaar-like, bank-like", () => {
    const f = scanText("a@b.co 9876501234 2345 6789 0123 and 556677889900123");
    const types = f.map((x) => x.type);
    for (const t of ["email", "phone_in", "aadhaar_like", "bank_account_like"]) expect(types).toContain(t);
  });
  it("never returns the raw value", () => {
    const f = scanText("acct 123456789012");
    expect(JSON.stringify(f)).not.toContain("123456789012");
  });
  it("redacts text", () => expect(redactText("mail a@b.co")).not.toContain("a@b.co"));
  it("clean text has no findings", () => expect(scanText("Summary: 3 invoices overdue").length).toBe(0));
});
