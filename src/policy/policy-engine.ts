import type { TaskPassport } from "./task-passport";
import type { ActionRequest } from "./action-validator";
import { scanPayload, summarizeFindings, severityAtLeast, type PrivacyScan } from "../privacy/sensitive-data";
import { resolveInSandbox, pathAllowed } from "../sandbox/path-guard";

export type Verdict = "allow" | "block" | "require_approval";
export interface PolicyDecision {
  verdict: Verdict;
  rule: string;
  reason: string;
  privacy: PrivacyScan;
  resource: string;
}

const PATH_ACTIONS = ["read_file", "summarize_invoice", "create_summary", "delete_file"];
const OUTBOUND = ["send_email", "export_data"];

export function resourceOf(type: string, params: Record<string, string>): string {
  if (type === "send_email") return `mailto:${params.to}`;
  if (type === "export_data") return `export:${params.destination}`;
  return params.path ?? "unknown";
}

// Ordered, deterministic evaluation. Explicit deny beats allow. Default is deny.
export function evaluatePolicy(task: TaskPassport | null, req: ActionRequest, params: Record<string, string>): PolicyDecision {
  const empty = summarizeFindings([]);
  const resource = resourceOf(req.type, params);
  const block = (rule: string, reason: string, privacy: PrivacyScan = empty): PolicyDecision => ({ verdict: "block", rule, reason, privacy, resource });

  if (!task) return block("task_not_found", "Task Passport does not exist — denied by default.");
  if (task.status !== "active") return block("task_inactive", "Task Passport is inactive.");
  const c = task.config;
  if (c.deniedActions.includes(req.type)) return block("explicit_deny", `"${req.type}" is explicitly denied by this Task Passport (deny overrides allow).`);
  if (!c.permittedActions.includes(req.type)) return block("not_permitted", `"${req.type}" is not in the permitted actions for this task (deny-by-default).`);

  if (PATH_ACTIONS.includes(req.type)) {
    const chk = resolveInSandbox(params.path);
    if (!chk.ok) return block("sandbox_boundary", `Sandbox boundary violation: ${chk.reason}`);
    if (!pathAllowed(chk.rel, c.allowedPaths)) return block("path_not_allowed", `Path "${chk.rel}" is outside the allowed paths (${c.allowedPaths.join(", ") || "none"}).`);
    if (req.type === "create_summary" && !chk.rel.startsWith("output/")) return block("write_scope", "Summaries may only be written to the output/ directory.");
  }

  let privacy = empty;
  if (OUTBOUND.includes(req.type)) {
    const dest = (req.type === "send_email" ? params.to : params.destination).toLowerCase();
    if (!c.allowedRecipients.map((r) => r.toLowerCase()).includes(dest))
      return block("recipient_not_allowed", `Destination "${dest}" is not on the allowed-recipient list.`);
    const payload = req.type === "send_email" ? { subject: params.subject, body: params.body } : { data: params.data };
    privacy = summarizeFindings(scanPayload(payload));
    const hits = privacy.findings.filter((f) => severityAtLeast(f.severity, c.sensitiveDataPolicy.minSeverity));
    if (hits.length) {
      const mode = c.sensitiveDataPolicy.onOutboundFinding;
      const kinds = [...new Set(hits.map((h) => h.type))].join(", ");
      if (mode === "block") return block("privacy_guard", `Outbound content contains ${hits.length} suspected sensitive item(s) (${kinds}). Policy: block.`, privacy);
      if (mode === "require_approval") return { verdict: "require_approval", rule: "privacy_guard_escalate", reason: `Outbound content has suspected sensitive data (${kinds}); human approval required.`, privacy, resource };
    }
  }

  if (c.approvalRequired.includes(req.type))
    return { verdict: "require_approval", rule: "approval_required", reason: `"${req.type}" requires human approval per Task Passport.`, privacy, resource };

  return { verdict: "allow", rule: "explicit_allow", reason: `"${req.type}" is permitted and all checks passed.`, privacy, resource };
}
