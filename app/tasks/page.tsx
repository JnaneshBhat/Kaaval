"use client";
import { useState } from "react";
import { FileLock2, Plus, CheckCircle2, Power } from "lucide-react";
import { api, useApi, useSelectedTask } from "@/components/client";
import { PageHeader, Loading, ErrorBox, Pill, Mono } from "@/components/ui";

const ACTIONS = ["read_file", "summarize_invoice", "create_summary", "send_email", "export_data", "delete_file"];
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function Tasks() {
  const { data, error, loading, reload } = useApi<any>("/api/tasks");
  const [sel, setSel] = useSelectedTask();
  const [form, setForm] = useState({ name: "", objective: "", permitted: ["read_file", "summarize_invoice", "create_summary"], denied: ["send_email", "export_data", "delete_file"], paths: "invoices/, output/", recipients: "", mode: "block", minSeverity: "medium", approval: [] as string[] });
  const [msg, setMsg] = useState<string | null>(null); const [show, setShow] = useState(false);

  async function create() {
    setMsg(null);
    try {
      const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
      const d = await api("/api/tasks", { method: "POST", body: JSON.stringify({ name: form.name, objective: form.objective, config: { permittedActions: form.permitted, deniedActions: form.denied, allowedPaths: csv(form.paths), allowedRecipients: csv(form.recipients), sensitiveDataPolicy: { onOutboundFinding: form.mode, minSeverity: form.minSeverity }, approvalRequired: form.approval } }) });
      setSel(d.task.id); setShow(false); reload();
    } catch (e: any) { setMsg(e.message); }
  }
  async function setStatus(id: string, status: string) { await api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); reload(); }
  const Chips = ({ k }: { k: "permitted" | "denied" | "approval" }) => <div className="flex flex-wrap gap-1.5">{ACTIONS.map((a) => <button type="button" key={a} onClick={() => setForm({ ...form, [k]: toggle(form[k], a) })} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition ${form[k].includes(a) ? (k === "denied" ? "bg-rose-500/20 text-rose-200 ring-rose-400/50" : k === "approval" ? "bg-amber-500/20 text-amber-200 ring-amber-400/50" : "bg-emerald-500/20 text-emerald-200 ring-emerald-400/50") : "text-slate-400 ring-white/15 hover:bg-white/5"}`}>{a}</button>)}</div>;

  return (
    <>
      <PageHeader title="Task Passports" sub="A passport defines exactly what an agent may do for one task. Deny-by-default: anything not listed is blocked, and explicit denies beat allows." icon={<FileLock2 className="h-6 w-6 text-white" />}>
        <button className="btn-primary" onClick={() => setShow(!show)}><Plus className="h-4 w-4" />New passport</button>
      </PageHeader>
      {show && (
        <div className="glass mb-6 grid gap-4 p-5 md:grid-cols-2 animate-pop">
          <div><label className="label">Task name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Weekly invoice digest" /></div>
          <div><label className="label">Objective</label><input className="input" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Summarize invoices and flag overdue ones" /></div>
          <div><label className="label">Permitted actions</label><Chips k="permitted" /></div>
          <div><label className="label">Denied actions (override allow)</label><Chips k="denied" /></div>
          <div><label className="label">Allowed sandbox paths (comma-separated)</label><input className="input" value={form.paths} onChange={(e) => setForm({ ...form, paths: e.target.value })} /></div>
          <div><label className="label">Allowed recipients / destinations</label><input className="input" value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} placeholder="accounts@company.example" /></div>
          <div><label className="label">Sensitive-data rule (outbound)</label><div className="flex gap-2"><select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}><option value="block">Block</option><option value="require_approval">Require approval</option><option value="allow">Allow</option></select><select className="input" value={form.minSeverity} onChange={(e) => setForm({ ...form, minSeverity: e.target.value })}><option value="low">≥ low</option><option value="medium">≥ medium</option><option value="high">≥ high</option></select></div></div>
          <div><label className="label">Always require approval for</label><Chips k="approval" /></div>
          {msg && <div className="md:col-span-2"><ErrorBox msg={msg} /></div>}
          <div className="md:col-span-2"><button className="btn-primary" onClick={create}>Create passport</button></div>
        </div>)}
      {loading && <Loading />}{error && <ErrorBox msg={error} />}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.tasks.map((t: any) => (
          <div key={t.id} className={`glass p-5 ${sel === t.id ? "!border-cyan-400/60 shadow-cyan-500/10" : ""}`}>
            <div className="mb-1 flex items-center gap-2"><h3 className="font-bold">{t.name}</h3><Pill v={t.status} />{sel === t.id && <span className="ml-auto flex items-center gap-1 text-xs text-cyan-300"><CheckCircle2 className="h-4 w-4" />Selected</span>}</div>
            <p className="mb-3 text-sm text-slate-400">{t.objective}</p>
            <div className="space-y-2 text-xs">
              <div className="flex flex-wrap gap-1.5">{t.config.permittedActions.map((a: string) => <span key={a} className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-300">✓ {a}</span>)}</div>
              <div className="flex flex-wrap gap-1.5">{t.config.deniedActions.map((a: string) => <span key={a} className="rounded-md bg-rose-500/15 px-2 py-0.5 text-rose-300">✕ {a}</span>)}</div>
              <div>Paths: {t.config.allowedPaths.map((p: string) => <Mono key={p}>{p}</Mono>)} </div>
              <div>Recipients: {t.config.allowedRecipients.length ? t.config.allowedRecipients.map((p: string) => <Mono key={p}>{p}</Mono>) : <span className="text-slate-500">none</span>}</div>
              <div>Sensitive data: <Mono>{t.config.sensitiveDataPolicy.onOutboundFinding} (≥{t.config.sensitiveDataPolicy.minSeverity})</Mono> · Approval for: {t.config.approvalRequired.length ? t.config.approvalRequired.join(", ") : <span className="text-slate-500">none</span>}</div>
            </div>
            <div className="mt-4 flex gap-2"><button className="btn-ghost" onClick={() => setSel(t.id)}>Select</button><button className="btn-ghost" onClick={() => setStatus(t.id, t.status === "active" ? "inactive" : "active")}><Power className="h-4 w-4" />{t.status === "active" ? "Deactivate" : "Activate"}</button></div>
          </div>))}
      </div>
    </>
  );
}
