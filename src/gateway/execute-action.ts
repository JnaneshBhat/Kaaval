import type { Store } from "../store/types";
import { validateAction } from "../policy/action-validator";
import { evaluatePolicy, type PolicyDecision } from "../policy/policy-engine";
import { tools, type ToolResult } from "../sandbox/mock-tools";
import { record } from "../audit/audit-service";
import { requestApproval, checkApproval, consumeApproval } from "./approval-service";

export type Outcome = "allowed" | "blocked" | "pending_approval";
export interface GatewayResult {
  outcome: Outcome;
  executed: boolean;
  rule: string;
  reason: string;
  resource: string;
  privacy: PolicyDecision["privacy"] | null;
  approvalId?: string;
  result?: ToolResult;
  auditEventIds: string[];
}

const EMPTY = { count: 0, byType: {}, maxSeverity: null, findings: [] } as PolicyDecision["privacy"];

// THE single choke point. UI, API routes and the agent all call this — nothing else touches protected tools.
export async function executeAction(store: Store, raw: unknown, opts: { dryRun?: boolean } = {}): Promise<GatewayResult> {
  const ids: string[] = [];
  const rawObj = (typeof raw === "object" && raw ? raw : {}) as Record<string, any>;
  const rawTask = typeof rawObj.taskId === "string" ? rawObj.taskId.slice(0, 64) : "unknown";
  const rawSource = rawObj.source === "attack-lab" || rawObj.source === "seed" ? rawObj.source : "live";
  const log = async (e: Parameters<typeof record>[1]) => { if (opts.dryRun) return; ids.push((await record(store, { source: rawSource, ...e })).id); };

  // 1. Schema validation
  const v = validateAction(raw);
  if (!v.ok) {
    await log({ taskId: rawTask, action: String(rawObj.type ?? "unknown").slice(0, 60), resource: "n/a", decision: "blocked", rule: v.rule, reason: v.reason, result: null, approvalId: null });
    return { outcome: "blocked", executed: false, rule: v.rule, reason: v.reason, resource: "n/a", privacy: null, auditEventIds: ids };
  }
  const { request, params } = v;

  // 2-4. Task authorization, resource authorization, privacy scan
  const task = await store.getTask(request.taskId);
  const d = evaluatePolicy(task, request, params);
  const base = { taskId: request.taskId, action: request.type, resource: d.resource, privacy: d.privacy };

  if (d.verdict === "block") {
    await log({ ...base, decision: "blocked", rule: d.rule, reason: d.reason, result: null, approvalId: request.approvalId ?? null });
    return { outcome: "blocked", executed: false, rule: d.rule, reason: d.reason, resource: d.resource, privacy: d.privacy, auditEventIds: ids };
  }

  // 5. Approval validation
  if (d.verdict === "require_approval") {
    if (!request.approvalId) {
      if (opts.dryRun) return { outcome: "pending_approval", executed: false, rule: d.rule, reason: d.reason, resource: d.resource, privacy: d.privacy, auditEventIds: ids };
      const recipient = request.type === "send_email" ? params.to : request.type === "export_data" ? params.destination : null;
      const apr = await requestApproval(store, { taskId: request.taskId, type: request.type, resource: d.resource, recipient, params, requester: request.requester, reason: d.reason });
      await log({ ...base, decision: "pending_approval", rule: d.rule, reason: d.reason, result: null, approvalId: apr.id });
      return { outcome: "pending_approval", executed: false, rule: d.rule, reason: d.reason, resource: d.resource, privacy: d.privacy, approvalId: apr.id, auditEventIds: ids };
    }
    const chk = await checkApproval(store, request.approvalId, request.taskId, request.type, params);
    if (!chk.ok) {
      await log({ ...base, decision: "blocked", rule: chk.rule, reason: chk.reason, result: null, approvalId: request.approvalId });
      return { outcome: "blocked", executed: false, rule: chk.rule, reason: chk.reason, resource: d.resource, privacy: d.privacy, approvalId: request.approvalId, auditEventIds: ids };
    }
    if (opts.dryRun) return { outcome: "allowed", executed: false, rule: "approval_valid", reason: "Valid approval present (dry run — not consumed).", resource: d.resource, privacy: d.privacy, approvalId: request.approvalId, auditEventIds: ids };
    if (!(await consumeApproval(store, request.approvalId))) {
      const reason = "Approval was consumed by a concurrent request — replay rejected.";
      await log({ ...base, decision: "blocked", rule: "approval_replay", reason, result: null, approvalId: request.approvalId });
      return { outcome: "blocked", executed: false, rule: "approval_replay", reason, resource: d.resource, privacy: d.privacy, approvalId: request.approvalId, auditEventIds: ids };
    }
  }

  if (opts.dryRun) return { outcome: "allowed", executed: false, rule: d.rule, reason: d.reason, resource: d.resource, privacy: d.privacy, auditEventIds: ids };

  // 6. Sandboxed execution
  const result = (tools[request.type] as (p: any) => ToolResult)(params);
  await log({ ...base, decision: "allowed", rule: d.rule, reason: d.reason, result: null, approvalId: request.approvalId ?? null });
  await log({ ...base, decision: "executed", rule: d.rule, reason: d.reason, result: result.output.slice(0, 300), approvalId: request.approvalId ?? null });
  return { outcome: "allowed", executed: result.ok, rule: d.rule, reason: d.reason, resource: d.resource, privacy: d.privacy ?? EMPTY, approvalId: request.approvalId, result, auditEventIds: ids };
}
