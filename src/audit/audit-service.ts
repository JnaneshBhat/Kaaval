import type { Store, NewAudit, Decision } from "../store/types";
import type { PolicyDecision } from "../policy/policy-engine";
import { verifyChain } from "./chain";

export function privacyJson(p: PolicyDecision["privacy"] | null) {
  // Only masked findings are persisted — never raw values.
  return JSON.stringify(p ? { count: p.count, byType: p.byType, maxSeverity: p.maxSeverity, findings: p.findings.map((f) => ({ type: f.type, field: f.field, severity: f.severity, masked: f.masked })) } : { count: 0, byType: {}, maxSeverity: null, findings: [] });
}

export async function record(store: Store, e: Omit<NewAudit, "privacyJson" | "source"> & { privacy?: PolicyDecision["privacy"] | null; source?: NewAudit["source"] }) {
  const { privacy, source, ...rest } = e;
  return store.addAudit({ ...rest, privacyJson: privacyJson(privacy ?? null), source: source ?? "live" });
}

export async function verifyAuditChain(store: Store) { return verifyChain(await store.allAuditAscending()); }
export type { Decision };
