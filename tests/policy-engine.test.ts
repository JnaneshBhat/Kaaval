import { describe, it, expect } from "vitest";
import { validateAction } from "../src/policy/action-validator";
import { evaluatePolicy } from "../src/policy/policy-engine";
import { INVOICE_TASK_CONFIG, type TaskPassport } from "../src/policy/task-passport";
import { resolveInSandbox } from "../src/sandbox/path-guard";

const task = (over: Partial<TaskPassport> = {}): TaskPassport => ({ id: "task-x1", name: "t", objective: "o", status: "active", config: INVOICE_TASK_CONFIG, createdAt: new Date(), updatedAt: new Date(), ...over });
function decide(t: TaskPassport | null, type: string, params: Record<string, unknown>) {
  const v = validateAction({ taskId: "task-x1", type, params });
  if (!v.ok) return { rule: v.rule, verdict: "block" };
  return evaluatePolicy(t, v.request, v.params);
}

describe("policy engine", () => {
  it("allows permitted read in allowed path", () => expect(decide(task(), "summarize_invoice", { path: "invoices/inv-001.txt" }).verdict).toBe("allow"));
  it("denies unknown action by default", () => expect(decide(task(), "format_disk", {}).rule).toBe("deny_unknown_action"));
  it("rejects malformed task id", () => expect(validateAction({ taskId: "../etc", type: "read_file", params: { path: "a" } }).ok).toBe(false));
  it("explicit deny overrides allow", () => {
    const t = task({ config: { ...INVOICE_TASK_CONFIG, permittedActions: ["send_email"], deniedActions: ["send_email"] } });
    expect(decide(t, "send_email", { to: "a@b.co", subject: "s", body: "b" }).rule).toBe("explicit_deny");
  });
  it("blocks inactive task", () => expect(decide(task({ status: "inactive" }), "read_file", { path: "invoices/a.txt" }).rule).toBe("task_inactive"));
  it("blocks path outside allowed paths", () => expect(decide(task(), "read_file", { path: "backups/backup-2026-10.txt" }).rule).toBe("path_not_allowed"));
  it("blocks traversal variants", () => {
    for (const p of ["../../etc/passwd", "invoices/../../x", "/etc/passwd", "%2e%2e/%2e%2e/etc/passwd", "invoices\\..\\x", "C:/Windows"])
      expect(resolveInSandbox(p).ok).toBe(false);
  });
  it("create_summary only into output/", () => expect(decide(task(), "create_summary", { path: "invoices/x.md", content: "x" }).rule).toBe("write_scope"));
  it("blocks email to non-allowlisted recipient when permitted", () => {
    const t = task({ config: { ...INVOICE_TASK_CONFIG, permittedActions: ["send_email"], deniedActions: [], allowedRecipients: ["ok@co.example"] } });
    expect(decide(t, "send_email", { to: "evil@x.example", subject: "s", body: "b" }).rule).toBe("recipient_not_allowed");
  });
  it("privacy guard blocks sensitive outbound per policy", () => {
    const t = task({ config: { ...INVOICE_TASK_CONFIG, permittedActions: ["send_email"], deniedActions: [], allowedRecipients: ["ok@co.example"] } });
    expect(decide(t, "send_email", { to: "ok@co.example", subject: "s", body: "acct 123456789012" }).rule).toBe("privacy_guard");
  });
  it("privacy guard escalates when policy says require_approval", () => {
    const t = task({ config: { ...INVOICE_TASK_CONFIG, permittedActions: ["export_data"], deniedActions: [], allowedRecipients: ["p.example.com"], sensitiveDataPolicy: { onOutboundFinding: "require_approval", minSeverity: "medium" } } });
    expect(decide(t, "export_data", { destination: "p.example.com", data: "9876501234" }).verdict).toBe("require_approval");
  });
});
