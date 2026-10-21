import type { Store, ApprovalRecord } from "../store/types";
import { newId, sha256 } from "../store/hash";
import { canonicalize } from "../policy/action-validator";
import { redactText } from "../privacy/sensitive-data";
import { record } from "../audit/audit-service";

export const approvalTtlMs = () => Number(process.env.KAAVAL_APPROVAL_TTL_MINUTES ?? 15) * 60_000;

export const hashAction = (taskId: string, type: string, params: Record<string, unknown>) => sha256(canonicalize(type, taskId, params));

export async function requestApproval(store: Store, a: { taskId: string; type: string; resource: string; recipient: string | null; params: Record<string, string>; requester: string; reason: string }) {
  const payloadHash = hashAction(a.taskId, a.type, a.params);
  const existing = await store.findPendingApproval(a.taskId, payloadHash);
  if (existing) return existing;
  return store.createApproval({ id: newId("apr"), taskId: a.taskId, actionType: a.type, resource: a.resource, recipient: a.recipient, payloadHash, payloadJson: JSON.stringify(a.params), requester: a.requester, reason: a.reason, status: "pending", expiresAt: new Date(Date.now() + approvalTtlMs()) });
}

export type ApprovalCheck = { ok: true; approval: ApprovalRecord } | { ok: false; rule: string; reason: string };

// Validates an approval for a concrete action. Does NOT consume it.
export async function checkApproval(store: Store, id: string, taskId: string, type: string, params: Record<string, unknown>): Promise<ApprovalCheck> {
  const a = await store.getApproval(id);
  if (!a) return { ok: false, rule: "approval_not_found", reason: "Approval does not exist." };
  if (a.taskId !== taskId) return { ok: false, rule: "approval_task_mismatch", reason: "Approval belongs to a different task." };
  if (a.status === "consumed") return { ok: false, rule: "approval_replay", reason: "Approval was already used (one-time only) — replay rejected." };
  if (a.status === "rejected" || a.status === "invalidated" || a.status === "expired") return { ok: false, rule: "approval_" + a.status, reason: `Approval is ${a.status}.` };
  if (a.status !== "approved") return { ok: false, rule: "approval_pending", reason: "Approval has not been granted yet." };
  if (a.expiresAt.getTime() < Date.now()) { await store.setApprovalStatus(id, ["approved", "pending"], "expired"); return { ok: false, rule: "approval_expired", reason: "Approval expired." }; }
  if (a.actionType !== type || a.payloadHash !== hashAction(taskId, type, params)) {
    await store.setApprovalStatus(id, ["approved", "pending"], "invalidated");
    return { ok: false, rule: "approval_payload_mismatch", reason: "Action no longer matches the approved payload (recipient/resource/content changed) — approval invalidated; a new approval is required." };
  }
  return { ok: true, approval: a };
}

// Atomically burns the approval. Returns false if another caller won the race.
export const consumeApproval = (store: Store, id: string) => store.setApprovalStatus(id, ["approved"], "consumed");

export async function decideApproval(store: Store, id: string, decision: "approve" | "reject", source: "live" | "attack-lab" | "seed" = "live") {
  const a = await store.getApproval(id);
  if (!a) return { ok: false as const, status: 404, reason: "Approval not found." };
  if (a.expiresAt.getTime() < Date.now()) { await store.setApprovalStatus(id, ["pending"], "expired"); return { ok: false as const, status: 409, reason: "Approval expired." }; }
  const ok = await store.setApprovalStatus(id, ["pending"], decision === "approve" ? "approved" : "rejected");
  if (!ok) return { ok: false as const, status: 409, reason: `Approval is not pending (current: ${(await store.getApproval(id))?.status}).` };
  await record(store, { taskId: a.taskId, action: a.actionType, resource: a.resource, decision: decision === "approve" ? "approved" : "rejected", rule: "human_decision", reason: `Reviewer ${decision}d the request.`, result: null, approvalId: id, source });
  return { ok: true as const, status: 200, approval: (await store.getApproval(id))! };
}

export function previewApproval(a: ApprovalRecord) {
  const params = JSON.parse(a.payloadJson) as Record<string, string>;
  const preview = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, redactText(String(v)).slice(0, 400)]));
  const { payloadJson, ...rest } = a;
  return { ...rest, preview };
}
