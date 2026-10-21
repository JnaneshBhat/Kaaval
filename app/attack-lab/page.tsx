"use client";
import { useEffect, useState } from "react";
import { Swords, Play, Zap, Flame, ShieldCheck } from "lucide-react";
import { api } from "@/components/client";
import { PageHeader, Loading, ErrorBox, Pill } from "@/components/ui";
import { ScenarioView } from "@/components/scenario-view";

export default function AttackLab() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [sel, setSel] = useState("s2-exfil");
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api("/api/attack-lab/run").then((d) => setScenarios(d.scenarios)).catch((e) => setErr(e.message)); }, []);

  async function run(all = false) {
    setBusy(true); setErr(null);
    try { const d = await api("/api/attack-lab/run", { method: "POST", body: JSON.stringify(all ? { all: true } : { scenarioId: sel }) }); setResults(d.results); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  const total = results.reduce((a, r) => a + r.attacksAttempted, 0), held = results.reduce((a, r) => a + r.attacksContained, 0);

  return (
    <>
      <PageHeader title="Attack Lab" sub="Watch indirect prompt injection happen — then watch the server-side gateway stop it. Every decision shown here is computed live by the real policy engine." icon={<Swords className="h-6 w-6 text-white" />}>
        <button className="btn-danger" onClick={() => run(true)} disabled={busy} data-testid="run-all"><Flame className="h-4 w-4" />Run full red-team suite</button>
      </PageHeader>
      {err && <ErrorBox msg={err} />}
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2">
          {scenarios.length === 0 && !err && <Loading />}
          {scenarios.map((s, i) => (
            <button key={s.id} data-testid={`scenario-${s.id}`} onClick={() => { setSel(s.id); setResults([]); }} className={`glass glass-hover w-full p-3 text-left ${sel === s.id ? "!border-cyan-400/70 bg-cyan-400/[0.08]" : ""}`}>
              <div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-violet-600 to-cyan-500 text-xs font-bold">{i + 1}</span><span className="text-sm font-bold">{s.title}</span></div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400"><Pill v={s.threat === "none" ? "allowed" : "blocked"} label={s.threat} /></div>
            </button>
          ))}
        </div>
        <div>
          <div className="glass mb-4 flex flex-wrap items-center gap-3 p-4">
            <div className="flex-1 text-sm text-slate-300">{scenarios.find((s) => s.id === sel)?.expected ?? "Select a scenario."}</div>
            <button className="btn-primary" onClick={() => run(false)} disabled={busy || !scenarios.length} data-testid="run-scenario"><Play className="h-4 w-4" />{busy ? "Running…" : "Run scenario"}</button>
          </div>
          {results.length > 1 && (
            <div className="glass mb-4 flex items-center gap-4 border-emerald-400/40 p-4" data-testid="suite-score"><ShieldCheck className="h-10 w-10 text-emerald-300" /><div><div className="text-2xl font-extrabold">{held}/{total} attacks contained</div><div className="text-sm text-slate-400">{results.length} scenarios replayed against the live gateway.</div></div></div>
          )}
          {busy && <Loading text="Gateway evaluating…" />}
          {!busy && results.length === 0 && <div className="glass grid place-items-center gap-2 p-12 text-center text-slate-400"><Zap className="h-8 w-8 text-cyan-300" />Pick a scenario and run it to see the attack and the defence side by side.</div>}
          <div className="space-y-10">{results.map((r) => <div key={r.scenario.id}>{results.length > 1 && <h2 className="mb-3 text-lg font-extrabold grad-text">{r.scenario.title}</h2>}<ScenarioView r={r} /></div>)}</div>
        </div>
      </div>
    </>
  );
}
