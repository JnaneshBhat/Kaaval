import { sha256 } from "../store/hash";
import type { AuditRecord } from "../store/types";

// Tamper-evident hash chain: each event commits to the previous event's hash.
export function chainHash(e: Omit<AuditRecord, "hash">): string {
  return sha256(JSON.stringify([e.prevHash, e.id, e.timestamp.toISOString(), e.taskId, e.action, e.resource, e.decision, e.rule, e.reason, e.privacyJson, e.result, e.approvalId, e.source]));
}

export function verifyChain(events: AuditRecord[]): { ok: boolean; checked: number; brokenAt?: string } {
  let prev = "GENESIS";
  for (const e of events) {
    if (e.prevHash !== prev || chainHash(e) !== e.hash) return { ok: false, checked: events.indexOf(e), brokenAt: e.id };
    prev = e.hash;
  }
  return { ok: true, checked: events.length };
}
