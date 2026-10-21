import type { Store } from "../store/types";
import { ensureDemoTasks } from "./demo-data";
import { runScenario } from "../agent/run-agent";

// Deterministic: wipes demo state, recreates tasks, replays scenarios 1 + 4 so the dashboard,
// audit log and Approval Center are populated the first time the app opens.
export async function seedDemoData(store: Store) {
  await store.reset();
  await ensureDemoTasks(store);
  await runScenario(store, "s1-legit", "seed");
  await runScenario(store, "s2-exfil", "seed");
  await runScenario(store, "s4-export", "seed");
  return { tasks: (await store.listTasks()).length, audit: (await store.listAudit({ limit: 1000 })).length, pendingApprovals: (await store.listApprovals("pending")).length };
}
