import { getStore } from "@/src/store/prisma-store";
import { listSandbox } from "@/src/sandbox/mock-tools";
import { ok } from "@/src/lib/api";
export const dynamic = "force-dynamic";

export async function GET() {
  let db: "connected" | "error" = "connected", tasks = 0;
  try { tasks = (await getStore().listTasks()).length; } catch { db = "error"; }
  return ok({ status: db === "connected" ? "ok" : "degraded", database: db, tasks, sandbox: { files: listSandbox("invoices").length, status: "ready" }, enforcement: "enabled", mode: "deterministic-simulated-agent", externalIntegrations: { realLLM: false, emailProvider: false } });
}
