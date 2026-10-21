import { z } from "zod";
import { getStore } from "@/src/store/prisma-store";
import { runScenario } from "@/src/agent/run-agent";
import { ok, fail, readJson, handle } from "@/src/lib/api";
export const dynamic = "force-dynamic";

// Task execution: the simulated agent proposes actions; every one goes through the gateway. source=live.
export const POST = (req: Request) => handle(async () => {
  const p = z.object({ scenarioId: z.string().max(40) }).safeParse(await readJson(req));
  if (!p.success) return fail(400, "validation_error", "scenarioId required", p.error.issues);
  const r = await runScenario(getStore(), p.data.scenarioId, "live");
  return r ? ok(r) : fail(404, "unknown_scenario", "No such scenario.");
});
