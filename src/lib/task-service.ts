import type { Store } from "../store/types";
import { TaskPassportInputSchema, type TaskPassport, type TaskPassportConfig } from "../policy/task-passport";
import { record } from "../audit/audit-service";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export async function createTaskPassport(store: Store, raw: unknown) {
  const p = TaskPassportInputSchema.safeParse(raw);
  if (!p.success) return { ok: false as const, issues: p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  const overlap = p.data.config.permittedActions.filter((a) => p.data.config.deniedActions.includes(a));
  const id = `task-${slug(p.data.name) || "custom"}-${Date.now().toString(36)}`;
  const task = await store.createTask(id, p.data);
  await record(store, { taskId: id, action: "passport_created", resource: id, decision: "executed", rule: "user_operation", reason: `Task Passport created by user.${overlap.length ? ` Note: ${overlap.join(", ")} are both permitted and denied — deny wins.` : ""}`, result: null, approvalId: null });
  return { ok: true as const, task };
}

// Only an authorized user operation may change permissions; agents have no path to this function.
export async function updateTaskPassport(store: Store, id: string, patch: { status?: "active" | "inactive"; config?: TaskPassportConfig }) {
  const t = await store.updateTask(id, patch);
  if (!t) return null;
  const invalidated = await store.invalidateOpenApprovals(id);
  await record(store, { taskId: id, action: "passport_updated", resource: id, decision: "executed", rule: "user_operation", reason: `Passport changed (${patch.status ? "status=" + patch.status : "config"}). ${invalidated} open approval(s) invalidated.`, result: null, approvalId: null });
  return t as TaskPassport;
}
