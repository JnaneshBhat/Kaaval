import { z } from "zod";
import { getStore } from "@/src/store/prisma-store";
import { updateTaskPassport } from "@/src/lib/task-service";
import { TaskPassportConfigSchema, TASK_ID_RE } from "@/src/policy/task-passport";
import { ok, fail, readJson, handle } from "@/src/lib/api";
export const dynamic = "force-dynamic";

export const GET = (_: Request, { params }: { params: { id: string } }) => handle(async () => {
  if (!TASK_ID_RE.test(params.id)) return fail(400, "bad_id", "Malformed task id.");
  const t = await getStore().getTask(params.id);
  return t ? ok({ task: t }) : fail(404, "not_found", "Task Passport not found.");
});
const Patch = z.object({ status: z.enum(["active", "inactive"]).optional(), config: TaskPassportConfigSchema.optional() }).refine((v) => v.status || v.config, "Nothing to update");
export const PATCH = (req: Request, { params }: { params: { id: string } }) => handle(async () => {
  if (!TASK_ID_RE.test(params.id)) return fail(400, "bad_id", "Malformed task id.");
  const p = Patch.safeParse(await readJson(req));
  if (!p.success) return fail(400, "validation_error", "Invalid input", p.error.issues);
  const t = await updateTaskPassport(getStore(), params.id, p.data);
  return t ? ok({ task: t }) : fail(404, "not_found", "Task Passport not found.");
});
