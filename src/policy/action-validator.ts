import { z } from "zod";
import { ACTION_TYPES, TASK_ID_RE } from "./task-passport";

const rel = z.string().min(1).max(260);
export const ActionSchemas = {
  read_file: z.object({ path: rel }).strict(),
  summarize_invoice: z.object({ path: rel }).strict(),
  create_summary: z.object({ path: rel, content: z.string().max(20000) }).strict(),
  send_email: z.object({ to: z.string().min(3).max(200), subject: z.string().max(200), body: z.string().max(20000) }).strict(),
  export_data: z.object({ destination: z.string().min(1).max(300), data: z.string().max(50000) }).strict(),
  delete_file: z.object({ path: rel }).strict(),
} as const;

export const ActionRequestSchema = z.object({
  taskId: z.string().regex(TASK_ID_RE, "malformed task id"),
  type: z.enum(ACTION_TYPES),
  params: z.record(z.unknown()),
  requester: z.string().max(80).default("simulated-agent"),
  approvalId: z.string().max(80).optional(),
  source: z.enum(["live", "attack-lab", "seed"]).default("live"),
});
export type ActionRequest = z.infer<typeof ActionRequestSchema>;

export type ValidationResult =
  | { ok: true; request: ActionRequest; params: Record<string, string> }
  | { ok: false; reason: string; rule: string };

export function validateAction(raw: unknown): ValidationResult {
  const base = ActionRequestSchema.safeParse(raw);
  if (!base.success) {
    const t = typeof raw === "object" && raw ? (raw as any).type : undefined;
    const unknownType = !(ACTION_TYPES as readonly string[]).includes(t);
    return {
      ok: false,
      rule: unknownType ? "deny_unknown_action" : "schema_invalid",
      reason: unknownType ? "Unknown action type — denied by default." : "Malformed request: " + base.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }
  const p = ActionSchemas[base.data.type].safeParse(base.data.params);
  if (!p.success) return { ok: false, rule: "schema_invalid", reason: `Invalid parameters for ${base.data.type}: ` + p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  return { ok: true, request: base.data, params: p.data as Record<string, string> };
}

// Canonical form with stable key order so hashing is deterministic.
export function canonicalize(type: string, taskId: string, params: Record<string, unknown>): string {
  const sorted = Object.keys(params).sort().reduce<Record<string, unknown>>((a, k) => ((a[k] = params[k]), a), {});
  return JSON.stringify({ taskId, type, params: sorted });
}
