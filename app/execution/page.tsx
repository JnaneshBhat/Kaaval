"use client";
import { useEffect, useState } from "react";
import { PlayCircle, Play, Lock, Unlock } from "lucide-react";
import { api, useApi, useSelectedTask } from "@/components/client";
import { PageHeader, Loading, ErrorBox, Pill, Mono } from "@/components/ui";
import { ScenarioView } from "@/components/scenario-view";

export default function Execution() {
  const [taskId] = useSelectedTask();
  const tasks = useApi<any>("/api/tasks");
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [sel, setSel] = useState("s1-legit");
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api("/api/attack-lab/run").then((d) => setScenarios(d.scenarios)).catch(() => {}); }, []);
  const task = tasks.data?.tasks?.find((t: any) => t.id === (scenarios.find((s) => s.id === sel)?.taskId ?? taskId));

  async function run() {
    setBusy(true); setErr(null);
    try { setRes(await api("/api/agent/run", { method: "POST", body: JSON.stringify({ scenarioId: sel }) })); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <>
      <PageHeader title="Task Execution" sub="Run the simulated agent. Each planned action is shown with its policy evaluation before and after execution. Events are recorded as LIVE (not Attack Lab)." icon={<PlayCircle className="h-6 w-6 text-white" />} />
      {tasks.loading && <Loading />}{tasks.error && <ErrorBox msg={tasks.error} />}
      <div className="glass mb-5 grid gap-4 p-4 md:grid-cols-[1fr_auto]">
        <div>
          <label className="label">Agent task</label>
          <select className="input" value={sel} onChange={(e) => { setSel(e.target.value); setRes(null); }}>{scenarios.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
          {task && <div className="mt-3 text-xs text-slate-400"><div className="mb-1 font-semibold text-slate-200">{task.name} <Pill v={task.status} /></div>
            <div className="flex flex-wrap gap-1.5">{task.config.permittedActions.map((a: string) => <span key={a} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-300"><Unlock className="h-3 w-3" />{a}</span>)}{task.config.deniedActions.map((a: string) => <span key={a} className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-rose-300"><Lock className="h-3 w-3" />{a}</span>)}</div>
            <div className="mt-2">Paths: {task.config.allowedPaths.map((p: string) => <Mono key={p}>{p}</Mono>)}</div></div>}
        </div>
        <button className="btn-primary self-end" onClick={run} disabled={busy}><Play className="h-4 w-4" />{busy ? "Running…" : "Run agent"}</button>
      </div>
      {err && <ErrorBox msg={err} />}{busy && <Loading text="Agent proposing, gateway evaluating…" />}
      {res && <ScenarioView r={res} />}
    </>
  );
}
