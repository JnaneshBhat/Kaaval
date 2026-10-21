"use client";
import { Fragment, useEffect, useState } from "react";
import { ScrollText, Download, Search, Link2 } from "lucide-react";
import { api } from "@/components/client";
import { PageHeader, Loading, ErrorBox, Empty, Pill, Mono, fmtTime } from "@/components/ui";

const DECISIONS = ["", "allowed", "blocked", "pending_approval", "approved", "rejected", "executed"];
export default function Audit() {
  const [q, setQ] = useState(""); const [decision, setDecision] = useState(""); const [source, setSource] = useState("");
  const [data, setData] = useState<any>(null); const [err, setErr] = useState<string | null>(null); const [open, setOpen] = useState<string | null>(null);
  const sp = new URLSearchParams(); if (q) sp.set("q", q); if (decision) sp.set("decision", decision); if (source) sp.set("source", source);
  const qs = sp.toString();
  useEffect(() => { const t = setTimeout(() => api("/api/audit?" + qs).then(setData).catch((e) => setErr(e.message)), 200); return () => clearTimeout(t); }, [qs]);
  return (
    <>
      <PageHeader title="Audit Log" sub="Every decision — including denials — is recorded. Raw sensitive values are never stored; events are linked in a tamper-evident hash chain." icon={<ScrollText className="h-6 w-6 text-white" />}>
        <a className="btn-ghost" href={"/api/audit?format=csv&" + qs}><Download className="h-4 w-4" />Export CSV</a>
      </PageHeader>
      {data && <div className={`glass mb-4 flex items-center gap-2 p-3 text-sm ${data.chain.ok ? "border-emerald-400/30 text-emerald-300" : "border-rose-400/50 text-rose-300"}`}><Link2 className="h-4 w-4" />{data.chain.ok ? `Hash chain intact — ${data.chain.checked} events verified.` : "Hash chain broken — possible tampering."}</div>}
      <div className="glass mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_180px_160px]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><input className="input pl-9" placeholder="Search action, resource, rule, reason…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="input" value={decision} onChange={(e) => setDecision(e.target.value)}>{DECISIONS.map((d) => <option key={d} value={d}>{d ? d.replace("_", " ") : "All decisions"}</option>)}</select>
        <select className="input" value={source} onChange={(e) => setSource(e.target.value)}><option value="">All sources</option><option value="live">Live</option><option value="attack-lab">Attack Lab</option><option value="seed">Seeded</option></select>
      </div>
      {err && <ErrorBox msg={err} />}{!data && !err && <Loading />}
      {data && data.events.length === 0 && <Empty text="No events match." />}
      {data && data.events.length > 0 && (
        <div className="glass overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-slate-400"><tr>{["Time", "Task", "Action", "Resource", "Decision", "Rule", "Privacy", "Src"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/10">{data.events.map((e: any) => (<Fragment key={e.id}>
            <tr onClick={() => setOpen(open === e.id ? null : e.id)} className="cursor-pointer hover:bg-white/5">
              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-400">{fmtTime(e.timestamp)}</td><td className="px-3 py-2.5"><Mono>{e.taskId.slice(0, 18)}</Mono></td><td className="px-3 py-2.5"><Mono>{e.action}</Mono></td>
              <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-300">{e.resource}</td><td className="px-3 py-2.5"><Pill v={e.decision} /></td><td className="px-3 py-2.5 text-xs text-slate-300">{e.rule}</td>
              <td className="px-3 py-2.5 text-xs">{JSON.parse(e.privacyJson).count > 0 ? <span className="text-amber-300">{JSON.parse(e.privacyJson).count} found</span> : <span className="text-slate-500">clean</span>}</td><td className="px-3 py-2.5"><Pill v={e.source} label={e.source === "seed" ? "seed" : e.source} /></td></tr>
            {open === e.id && <tr className="bg-black/20"><td colSpan={8} className="space-y-1 px-4 py-3 text-xs text-slate-300"><div><b>Reason:</b> {e.reason}</div>{e.result && <div><b>Execution result:</b> {e.result}</div>}{e.approvalId && <div><b>Approval:</b> <Mono>{e.approvalId}</Mono></div>}<div><b>Privacy scan:</b> <Mono>{e.privacyJson}</Mono></div><div className="text-slate-500">hash {e.hash.slice(0, 24)}… ← prev {e.prevHash.slice(0, 12)}…</div></td></tr>}</Fragment>))}</tbody>
        </table></div>)}
    </>
  );
}
