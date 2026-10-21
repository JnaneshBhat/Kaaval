import type { Store } from "../store/types";
import { executeAction, type GatewayResult } from "../gateway/execute-action";
import { decideApproval } from "../gateway/approval-service";
import { ensureDemoTasks } from "../lib/demo-data";
import { scanPayload, summarizeFindings } from "../privacy/sensitive-data";
import { scanDocumentForInjection, type InjectionScan } from "./injection-scanner";
import { proposeSummaryActions, proposeFromUntrustedDocument, type Proposal } from "./simulated-agent";
import { SCENARIOS, ALL_INVOICES, type Scenario } from "./scenarios";

export interface StepResult {
  label: string; origin: Proposal["origin"]; type: string; params: Record<string, unknown>;
  unprotected: string; // SIMULATION ONLY — nothing is executed
  gateway: GatewayResult;
  malicious: boolean;
}
export interface ScenarioResult {
  scenario: Scenario; documentScan: InjectionScan | null; steps: StepResult[];
  attacksAttempted: number; attacksContained: number; summary?: string; contained: boolean;
}

// Pure text-only simulation of "what would have happened with no enforcement".
export function simulateUnprotected(type: string, params: Record<string, any>): string {
  const sev = (s: unknown) => { const f = summarizeFindings(scanPayload(s)); return f.count ? `${f.count} sensitive-looking item(s): ${Object.keys(f.byType).join(", ")}` : "no sensitive patterns"; };
  switch (type) {
    case "send_email": return `SIMULATED: email would be delivered to ${params.to} containing ${sev([params.subject, params.body])}.`;
    case "export_data": return `SIMULATED: ${String(params.data ?? "").length} chars would leave the system for ${params.destination} (${sev(params.data)}).`;
    case "delete_file": return `SIMULATED: ${params.path} would be permanently deleted.`;
    case "read_file": return `SIMULATED: ${params.path} would be read and its contents exposed to the agent.`;
    case "create_summary": return `SIMULATED: summary written to ${params.path}.`;
    case "summarize_invoice": return `SIMULATED: ${params.path} would be parsed.`;
    default: return `SIMULATED: unknown action "${type}" would be attempted by a naive agent.`;
  }
}

export async function runScenario(store: Store, scenarioId: string, source: "live" | "attack-lab" | "seed" = "attack-lab"): Promise<ScenarioResult | null> {
  const sc = SCENARIOS.find((s) => s.id === scenarioId);
  if (!sc) return null;
  await ensureDemoTasks(store);
  const gwSource = source;
  const steps: StepResult[] = [];
  const run = async (p: Proposal, malicious: boolean, extra: Record<string, unknown> = {}) => {
    const gateway = await executeAction(store, { taskId: sc.taskId, type: p.type, params: p.params, requester: "simulated-agent", source: gwSource, ...extra });
    steps.push({ label: p.label, origin: p.origin, type: p.type, params: p.params, unprotected: simulateUnprotected(p.type, p.params as any), gateway, malicious });
    return gateway;
  };

  let documentScan: InjectionScan | null = null;
  let summary: string | undefined;

  if (sc.kind === "benign") {
    const props = proposeSummaryActions(ALL_INVOICES, "output/invoice-summary.md");
    const lines: string[] = [];
    for (const p of props) {
      if (p.type === "create_summary") {
        const overdue = lines.filter((l) => l.includes("OVERDUE"));
        summary = `# Invoice summary (as of 2026-10-15)\n\n${lines.map((l) => "- " + l).join("\n")}\n\n## Overdue (${overdue.length})\n${overdue.map((l) => "- " + l).join("\n")}\n`;
        p.params.content = summary;
      }
      const g = await run(p, false);
      if (p.type === "summarize_invoice" && g.result?.ok) lines.push(g.result.output);
    }
  } else if (sc.kind === "hijack" && sc.docPath) {
    const read = await run({ type: "read_file", params: { path: sc.docPath }, label: `Read ${sc.docPath}`, origin: "user_task" }, false);
    const text = (read.result?.data as { text?: string } | undefined)?.text ?? "";
    documentScan = scanDocumentForInjection(text);
    let props = proposeFromUntrustedDocument(text, sc.docPath);
    if (sc.id === "s3-delete") props = [...props.filter((p) => p.type === "delete_file"), { type: "delete_file", params: { path: "backups/backup-2026-10.txt" }, label: "Delete backups/backup-2026-10.txt", origin: "untrusted_document" }];
    if (sc.id === "s6-traversal") props = props.filter((p) => p.type === "read_file");
    if (sc.id === "s4-export") props = props.filter((p) => p.type === "export_data");
    for (const p of props) await run(p, true);
  } else if (sc.kind === "followup") {
    await run({ type: "summarize_invoice", params: { path: "invoices/inv-001.txt" }, label: "Summarize invoices/inv-001.txt", origin: "user_task" }, false);
    await run({ type: "send_email", params: { to: "accountant@trader.example", subject: "Invoice summary", body: "Summary attached." }, label: "Email summary to accountant", origin: "user_followup" }, true);
    await run({ type: "wire_transfer", params: { amount: 980000 }, label: "Wire overdue amount", origin: "user_followup" }, true);
  } else if (sc.kind === "approval_tamper" || sc.kind === "approval_replay") {
    const good = { destination: "audit-portal.example.com", data: "Customer: Coastal Agro Exports\nBank Account: 556677889900" };
    const p: Proposal = { type: "export_data", params: good, label: "Export reconciliation extract", origin: "user_task" };
    const first = await run(p, false);
    if (first.approvalId) {
      const d = await decideApproval(store, first.approvalId, "approve", gwSource);
      if (d.ok) {
        if (sc.kind === "approval_tamper") {
          await run({ type: "export_data", params: { ...good, data: good.data + "\nCustomer: Malabar Dry Fruits\nBank Account: 123456789012" }, label: "Re-submit with extra customer records added", origin: "untrusted_document" }, true, { approvalId: first.approvalId });
        } else {
          await run({ ...p, label: "Execute with approval (first use)" }, false, { approvalId: first.approvalId });
          await run({ ...p, label: "Replay same approval (second use)", origin: "untrusted_document" }, true, { approvalId: first.approvalId });
        }
      }
    }
  }

  const attacks = steps.filter((s) => s.malicious);
  const contained = attacks.filter((s) => s.gateway.outcome !== "allowed" || !s.gateway.executed);
  const result: ScenarioResult = { scenario: sc, documentScan, steps, attacksAttempted: attacks.length, attacksContained: contained.length, summary, contained: attacks.length === contained.length };
  await store.addScenarioRun({ scenarioId: sc.id, taskId: sc.taskId, outcome: { contained: result.contained, attacks: attacks.length } });
  return result;
}

export async function runAllScenarios(store: Store) {
  const out: ScenarioResult[] = [];
  for (const s of SCENARIOS) { const r = await runScenario(store, s.id); if (r) out.push(r); }
  return out;
}
