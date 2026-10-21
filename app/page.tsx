"use client";
import Link from "next/link";
import { ShieldCheck, Swords, ClipboardCheck, ScrollText, CheckCircle2, XCircle, Clock, Zap, Link2, ArrowRight, Database } from "lucide-react";
import { useApi, useSelectedTask } from "@/components/client";
import { Loading, ErrorBox, Pill, Mono, fmtTime, Empty } from "@/components/ui";

export default function Overview() {
  const { data, error, loading } = useApi<any>("/api/stats");
  const [taskId] = useSelectedTask();
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox msg={error ?? "No data"} />;
  const t = data.totals;
  const task = data.tasks.find((x: any) => x.id === taskId) ?? data.tasks[0];
  const cards = [
    { k: "Allowed", v: t.allowed, icon: CheckCircle2, g: "from-emerald-500 to-teal-500" },
    { k: "Blocked", v: t.blocked, icon: XCircle, g: "from-rose-500 to-orange-500" },
    { k: "Pending approval", v: t.pending, icon: Clock, g: "from-amber-400 to-yellow-500" },
    { k: "Executed", v: t.executed, icon: Zap, g: "from-sky-500 to-indigo-500" },
  ];
  return (
    <>
      <section className="glass relative mb-6 overflow-hidden p-6 sm:p-8 animate-pop">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-violet-600/40 to-cyan-400/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-500 to-cyan-400 shadow-xl shadow-indigo-900/60 animate-floaty"><ShieldCheck className="h-9 w-9 text-white" /></div>
          <div className="min-w-0 flex-1">
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl"><span className="grad-text">Kaaval</span></h1>
            <p className="mt-1 text-lg text-slate-300">Security and control for AI agents.</p>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Every action an agent proposes is checked by a server-side gateway against a task-specific permission policy — so a poisoned invoice can’t talk your agent into leaking or deleting data.</p>
          </div>
          <Link href="/attack-lab" className="btn-primary"><Swords className="h-4 w-4" />Launch Attack Lab</Link>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ k, v, icon: Icon, g }, i) => (
          <div key={k} className="glass glass-hover p-4 animate-pop" style={{ animationDelay: `${i * 70}ms` }}>
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${g} shadow-lg`}><Icon className="h-5 w-5 text-white" /></div>
            <div className="text-3xl font-black">{v}</div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{k}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="glass p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Recent security events</h2><Link href="/audit" className="flex items-center gap-1 text-xs text-cyan-300">Full audit log <ArrowRight className="h-3 w-3" /></Link></div>
          {data.recent.length === 0 ? <Empty text="No events yet. Run a scenario in the Attack Lab." /> : (
            <ul className="divide-y divide-white/10">{data.recent.map((e: any) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <Pill v={e.decision} /><Mono>{e.action}</Mono><span className="min-w-0 flex-1 truncate text-slate-400">{e.resource}</span>
                <Pill v={e.source} label={e.source === "seed" ? "seeded demo" : e.source} /><span className="text-[11px] text-slate-500">{fmtTime(e.timestamp)}</span>
              </li>))}</ul>)}
        </div>
        <div className="space-y-5">
          <div className="glass p-5">
            <h2 className="mb-1 font-bold">Current Task Passport</h2>
            {task && <><div className="flex items-center gap-2 text-sm font-semibold">{task.name}<Pill v={task.status} /></div><p className="mt-1 text-xs text-slate-400">{task.objective}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">{task.config.permittedActions.map((a: string) => <span key={a} className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-300">✓ {a}</span>)}{task.config.deniedActions.map((a: string) => <span key={a} className="rounded-md bg-rose-500/15 px-2 py-0.5 text-rose-300">✕ {a}</span>)}</div>
              <Link href="/tasks" className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-300">Manage passports <ArrowRight className="h-3 w-3" /></Link></>}
          </div>
          <div className="glass p-5">
            <h2 className="mb-2 font-bold">Data provenance</h2>
            <p className="mb-2 text-xs text-slate-400">Counts come from the real audit table. Event sources:</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><Pill v="live" /><b>{data.bySource.live ?? 0}</b></div>
              <div className="flex justify-between"><Pill v="attack-lab" /><b>{data.bySource["attack-lab"] ?? 0}</b></div>
              <div className="flex justify-between"><Pill v="seed" label="seeded demo" /><b>{data.bySource.seed ?? 0}</b></div>
            </div>
            <div className={`mt-3 flex items-center gap-2 rounded-lg p-2 text-xs ${data.chain.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}><Link2 className="h-4 w-4" />{data.chain.ok ? `Audit hash-chain verified (${data.chain.checked} events)` : "Audit chain BROKEN — tampering detected"}</div>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[{ h: "/attack-lab", t: "Attack Lab", d: "Run injection attacks", i: Swords }, { h: "/approvals", t: "Approvals", d: `${t.pending} awaiting review`, i: ClipboardCheck }, { h: "/audit", t: "Audit Log", d: `${t.events} events recorded`, i: ScrollText }].map(({ h, t: tt, d, i: I }) => (
          <Link key={h} href={h} className="glass glass-hover flex items-center gap-3 p-4"><I className="h-6 w-6 text-cyan-300" /><div><div className="font-bold">{tt}</div><div className="text-xs text-slate-400">{d}</div></div><ArrowRight className="ml-auto h-4 w-4 text-slate-500" /></Link>
        ))}
      </div>
      <p className="mt-6 flex items-center gap-2 text-[11px] text-slate-500"><Database className="h-3.5 w-3.5" />Prototype · deterministic simulated agent · fictional sample data · tools are sandboxed mocks.</p>
    </>
  );
}
