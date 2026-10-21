"use client";
import { useState } from "react";
import { Settings, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { api, useApi } from "@/components/client";
import { PageHeader, Loading, ErrorBox, Pill } from "@/components/ui";

export default function System() {
  const { data, error, loading, reload } = useApi<any>("/api/health");
  const [msg, setMsg] = useState<string | null>(null);
  async function reset() { if (!confirm("Wipe all tasks, approvals and audit events and re-seed demo data?")) return; try { const d = await api("/api/admin/reset-demo", { method: "POST" }); setMsg(`Re-seeded: ${d.seeded.tasks} tasks, ${d.seeded.audit} events, ${d.seeded.pendingApprovals} pending approval.`); reload(); } catch (e: any) { setMsg(e.message); } }
  const Row = ({ k, ok, v }: { k: string; ok: boolean; v: string }) => <div className="flex items-center gap-3 border-b border-white/10 py-3 last:border-0">{ok ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-slate-500" />}<span className="flex-1 font-medium">{k}</span><span className="text-sm text-slate-400">{v}</span></div>;
  return (
    <>
      <PageHeader title="System Status" sub="What is actually running — nothing here claims an integration that isn’t connected." icon={<Settings className="h-6 w-6 text-white" />}>
        <button className="btn-ghost" onClick={reset}><RefreshCw className="h-4 w-4" />Reset demo data</button>
      </PageHeader>
      {msg && <div className="glass mb-4 p-3 text-sm text-cyan-200">{msg}</div>}
      {loading && <Loading />}{error && <ErrorBox msg={error} />}
      {data && <div className="glass p-5">
        <Row k="Demo mode" ok v="Deterministic simulated agent (no LLM)" />
        <Row k="Policy enforcement" ok={data.enforcement === "enabled"} v="Enabled — server-side gateway, always on" />
        <Row k="Database (SQLite via Prisma)" ok={data.database === "connected"} v={data.database === "connected" ? `Connected · ${data.tasks} task passports` : "Not reachable — run npm run setup"} />
        <Row k="Sandbox directory" ok={data.sandbox.status === "ready"} v={`Ready · ${data.sandbox.files} sample invoices (fictional)`} />
        <Row k="Real AI model" ok={false} v="Not connected" />
        <Row k="Email provider" ok={false} v="Not connected — send_email is simulated" />
        <div className="mt-3"><Pill v={data.status === "ok" ? "allowed" : "blocked"} label={`health: ${data.status}`} /></div>
      </div>}
    </>
  );
}
