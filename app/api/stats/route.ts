import { getStore } from "@/src/store/prisma-store";
import { ensureDemoTasks } from "@/src/lib/demo-data";
import { verifyAuditChain } from "@/src/audit/audit-service";
import { ok, handle } from "@/src/lib/api";
export const dynamic = "force-dynamic";

export const GET = () => handle(async () => {
  const s = getStore();
  await ensureDemoTasks(s);
  const all = await s.allAuditAscending();
  const count = (d: string) => all.filter((e) => e.decision === d).length;
  const bySource = { live: 0, "attack-lab": 0, seed: 0 } as Record<string, number>;
  all.forEach((e) => (bySource[e.source] = (bySource[e.source] ?? 0) + 1));
  const tasks = await s.listTasks();
  return ok({
    totals: { events: all.length, allowed: count("allowed"), blocked: count("blocked"), pending: (await s.listApprovals("pending")).length, executed: count("executed") },
    bySource, tasks, scenarioRuns: await s.countScenarioRuns(),
    recent: all.slice(-8).reverse(), chain: await verifyAuditChain(s),
  });
});
