import { z } from "zod";
import { getStore } from "@/src/store/prisma-store";
import { runScenario, runAllScenarios } from "@/src/agent/run-agent";
import { SCENARIOS } from "@/src/agent/scenarios";
import { ok, fail, readJson, handle } from "@/src/lib/api";
export const dynamic = "force-dynamic";

export const GET = () => handle(async () => ok({ scenarios: SCENARIOS }));
export const POST = (req: Request) => handle(async () => {
  const p = z.object({ scenarioId: z.string().max(40).optional(), all: z.boolean().optional() }).safeParse(await readJson(req));
  if (!p.success || (!p.data.scenarioId && !p.data.all)) return fail(400, "validation_error", "Provide scenarioId or all=true");
  const s = getStore();
  if (p.data.all) return ok({ results: await runAllScenarios(s) });
  const r = await runScenario(s, p.data.scenarioId!, "attack-lab");
  return r ? ok({ results: [r] }) : fail(404, "unknown_scenario", "No such scenario.");
});
