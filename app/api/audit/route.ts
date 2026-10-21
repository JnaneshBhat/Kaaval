import { getStore } from "@/src/store/prisma-store";
import { verifyAuditChain } from "@/src/audit/audit-service";
import { ok, handle } from "@/src/lib/api";
export const dynamic = "force-dynamic";

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`; // neutralise CSV formula injection

export const GET = (req: Request) => handle(async () => {
  const sp = new URL(req.url).searchParams;
  const s = getStore();
  const events = await s.listAudit({ decision: sp.get("decision") || undefined, taskId: sp.get("taskId") || undefined, source: sp.get("source") || undefined, q: sp.get("q")?.slice(0, 80) || undefined, limit: Math.min(Number(sp.get("limit") ?? 200) || 200, 1000) });
  if (sp.get("format") === "csv") {
    const head = ["timestamp", "taskId", "action", "resource", "decision", "rule", "reason", "privacy", "result", "approvalId", "source", "hash"];
    const rows = events.map((e) => [e.timestamp.toISOString(), e.taskId, e.action, e.resource, e.decision, e.rule, e.reason, e.privacyJson, e.result, e.approvalId, e.source, e.hash].map(csvCell).join(","));
    return new Response([head.join(","), ...rows].join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="kaaval-audit.csv"' } });
  }
  return ok({ events, chain: await verifyAuditChain(s) });
});
