import { getStore } from "@/src/store/prisma-store";
import { createTaskPassport } from "@/src/lib/task-service";
import { ensureDemoTasks } from "@/src/lib/demo-data";
import { ok, fail, readJson, handle } from "@/src/lib/api";
export const dynamic = "force-dynamic";

export const GET = () => handle(async () => { const s = getStore(); await ensureDemoTasks(s); return ok({ tasks: await s.listTasks() }); });
export const POST = (req: Request) => handle(async () => {
  const body = await readJson(req);
  if (body === undefined) return fail(400, "bad_json", "Body must be JSON.");
  const r = await createTaskPassport(getStore(), body);
  return r.ok ? ok({ task: r.task }, 201) : fail(400, "validation_error", "Invalid Task Passport", r.issues);
});
