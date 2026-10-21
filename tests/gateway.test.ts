import { describe, it, expect, beforeEach } from "vitest";
import { freshStore, TASK_INVOICE, TASK_VENDOR } from "./helpers";
import { executeAction } from "../src/gateway/execute-action";
import { decideApproval } from "../src/gateway/approval-service";
import { runScenario, runAllScenarios } from "../src/agent/run-agent";
import { seedDemoData } from "../src/lib/seed";
import { verifyAuditChain } from "../src/audit/audit-service";
import { updateTaskPassport } from "../src/lib/task-service";
import type { MemoryStore } from "../src/store/memory-store";

let store: MemoryStore;
beforeEach(async () => { store = (await freshStore()) as MemoryStore; });
const exportReq = (extra: Record<string, unknown> = {}, data = "Bank Account: 556677889900") => ({ taskId: TASK_VENDOR, type: "export_data", params: { destination: "audit-portal.example.com", data }, ...extra });

describe("gateway acceptance", () => {
  it("1. permitted summarization succeeds", async () => {
    const r = await runScenario(store, "s1-legit");
    expect(r!.steps.every((s) => s.gateway.outcome === "allowed" && s.gateway.executed)).toBe(true);
  });
  it("2. embedded instruction cannot authorize an email", async () => {
    const r = await runScenario(store, "s2-exfil");
    const email = r!.steps.find((s) => s.type === "send_email")!;
    expect(email.gateway.outcome).toBe("blocked");
    expect(email.gateway.executed).toBe(false);
  });
  it("3. deletion blocked before execution", async () => {
    const g = await executeAction(store, { taskId: TASK_INVOICE, type: "delete_file", params: { path: "invoices/inv-003.txt" } });
    expect(g.outcome).toBe("blocked"); expect(g.executed).toBe(false); expect(g.result).toBe(undefined);
  });
  it("4. sensitive outbound is escalated", async () => {
    const g = await executeAction(store, exportReq());
    expect(g.outcome).toBe("pending_approval"); expect(g.executed).toBe(false);
  });
  it("5. nonexistent action denied", async () => expect((await executeAction(store, { taskId: TASK_INVOICE, type: "rm_rf", params: {} })).outcome).toBe("blocked"));
  it("6. path traversal blocked", async () => {
    const g = await executeAction(store, { taskId: TASK_INVOICE, type: "read_file", params: { path: "../../etc/passwd" } });
    expect(g.rule).toBe("sandbox_boundary");
  });
  it("7. legitimate approval works once", async () => {
    const p = await executeAction(store, exportReq());
    await decideApproval(store, p.approvalId!, "approve");
    const g = await executeAction(store, exportReq({ approvalId: p.approvalId }));
    expect(g.outcome).toBe("allowed"); expect(g.executed).toBe(true);
  });
  it("8. approval cannot be replayed", async () => {
    const p = await executeAction(store, exportReq());
    await decideApproval(store, p.approvalId!, "approve");
    await executeAction(store, exportReq({ approvalId: p.approvalId }));
    const again = await executeAction(store, exportReq({ approvalId: p.approvalId }));
    expect(again.rule).toBe("approval_replay"); expect(again.executed).toBe(false);
  });
  it("9. changed payload invalidates approval", async () => {
    const p = await executeAction(store, exportReq());
    await decideApproval(store, p.approvalId!, "approve");
    const g = await executeAction(store, exportReq({ approvalId: p.approvalId }, "Bank Account: 556677889900 plus more"));
    expect(g.rule).toBe("approval_payload_mismatch");
    expect((await store.getApproval(p.approvalId!))!.status).toBe("invalidated");
  });
  it("9b. unapproved / rejected approvals cannot execute", async () => {
    const p = await executeAction(store, exportReq());
    expect((await executeAction(store, exportReq({ approvalId: p.approvalId }))).rule).toBe("approval_pending");
    await decideApproval(store, p.approvalId!, "reject");
    expect((await executeAction(store, exportReq({ approvalId: p.approvalId }))).rule).toBe("approval_rejected");
  });
  it("9c. changing the passport invalidates open approvals", async () => {
    const p = await executeAction(store, exportReq());
    await decideApproval(store, p.approvalId!, "approve");
    await updateTaskPassport(store, TASK_VENDOR, { status: "inactive" });
    expect((await store.getApproval(p.approvalId!))!.status).toBe("invalidated");
  });
  it("10. every denied action generates an audit event", async () => {
    const before = store.audit.length;
    const reqs: unknown[] = [
      { taskId: TASK_INVOICE, type: "delete_file", params: { path: "invoices/inv-003.txt" } },
      { taskId: TASK_INVOICE, type: "nope", params: {} },
      { taskId: "bad id!", type: "read_file", params: {} },
      { taskId: TASK_INVOICE, type: "read_file", params: { path: "../x" } },
    ];
    for (const r of reqs) await executeAction(store, r);
    expect(store.audit.length - before).toBe(reqs.length);
    expect(store.audit.slice(before).every((e) => e.decision === "blocked")).toBe(true);
  });
  it("audit never stores raw sensitive values and the hash chain verifies", async () => {
    await runAllScenarios(store);
    const blob = JSON.stringify(store.audit);
    for (const raw of ["123456789012", "556677889900", "9876501234"]) expect(blob).not.toContain(raw);
    expect((await verifyAuditChain(store)).ok).toBe(true);
    store.audit[2].reason = "tampered";
    expect((await verifyAuditChain(store)).ok).toBe(false);
  });
  it("all attack-lab scenarios are contained", async () => {
    for (const r of await runAllScenarios(store)) expect(r.contained).toBe(true);
  });
  it("12. seed makes the app demo-ready", async () => {
    const s = await seedDemoData(store);
    expect(s.tasks).toBeGreaterThan(1); expect(s.audit).toBeGreaterThan(5); expect(s.pendingApprovals).toBe(1);
  });
});

describe("provenance", () => {
  it("seeded events are labelled seed, lab runs attack-lab", async () => {
    await seedDemoData(store);
    expect(store.audit.every((e) => e.source === "seed")).toBe(true);
    await runScenario(store, "s6-traversal");
    expect(store.audit[store.audit.length - 1].source).toBe("attack-lab");
  });
});
