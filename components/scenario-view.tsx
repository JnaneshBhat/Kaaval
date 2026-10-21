"use client";
import { ShieldCheck, ShieldAlert, Skull, User, FileWarning, Bot, Fingerprint, ScrollText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Pill, Mono } from "./ui";

const ICON: Record<string, any> = { allowed: CheckCircle2, blocked: XCircle, pending_approval: Clock };
const ORIGIN: Record<string, string> = { user_task: "User task", untrusted_document: "Untrusted document", user_followup: "Follow-up request" };

export function ScenarioView({ r }: { r: any }) {
  const sc = r.scenario;
  return (
    <div className="space-y-5 animate-pop" data-testid="scenario-result">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="glass p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300"><User className="h-4 w-4" />Original user task</div><p className="text-sm text-slate-200">{sc.userTask}</p></div>
        <div className="glass border-rose-400/30 bg-rose-500/[0.06] p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-300"><FileWarning className="h-4 w-4" />Untrusted instruction</div><p className="text-sm italic text-rose-100">“{sc.untrustedInstruction}”</p>
          {r.documentScan && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><Fingerprint className="h-4 w-4 text-amber-300" /><span className="text-slate-300">Injection scan:</span><Pill v={r.documentScan.level === "malicious" ? "blocked" : r.documentScan.level === "suspicious" ? "pending" : "allowed"} label={`${r.documentScan.level} · ${r.documentScan.score}/100`} />{r.documentScan.matches.map((m: any) => <span key={m.id} className="rounded-md bg-black/30 px-2 py-0.5 text-[11px] text-amber-200">{m.label}</span>)}</div>}
        </div>
      </div>

      <div className={`glass flex flex-wrap items-center gap-4 p-4 ${r.contained ? "border-emerald-400/40" : "border-rose-400/50"}`} data-testid="scoreboard">
        {r.contained ? <ShieldCheck className="h-9 w-9 text-emerald-300" /> : <ShieldAlert className="h-9 w-9 text-rose-300" />}
        <div className="flex-1"><div className="text-lg font-extrabold">{r.attacksAttempted === 0 ? "Legitimate workflow completed" : r.contained ? "All malicious actions contained" : "Attack not fully contained!"}</div>
          <div className="text-sm text-slate-400">{r.attacksAttempted === 0 ? `${r.steps.length} actions evaluated and allowed by the gateway.` : `${r.attacksContained} of ${r.attacksAttempted} malicious action(s) stopped before execution. Expected: ${sc.expected}`}</div></div>
      </div>

      <div className="space-y-4">
        {r.steps.map((s: any, i: number) => {
          const g = s.gateway; const Icon = ICON[g.outcome] ?? XCircle;
          const border = g.outcome === "blocked" ? "border-rose-400/40" : g.outcome === "pending_approval" ? "border-amber-400/40" : "border-emerald-400/30";
          return (
            <div key={i} className={`glass overflow-hidden ${border}`} data-testid={`step-${i}`}>
              <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-xs font-bold">{i + 1}</span>
                <span className="font-semibold">{s.label}</span>
                <Mono>{s.type}</Mono>
                <span className={`ml-auto rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.malicious ? "bg-rose-500/15 text-rose-300" : "bg-sky-500/15 text-sky-300"}`}>{ORIGIN[s.origin]}</span>
              </div>
              <div className="grid md:grid-cols-2">
                <div className="border-b border-white/10 p-4 md:border-b-0 md:border-r">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-300"><Skull className="h-4 w-4" />Without Kaaval <span className="rounded bg-orange-500/20 px-1.5 text-[10px]">simulation only</span></div>
                  <p className="text-sm text-slate-300">{s.unprotected}</p>
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300"><ShieldCheck className="h-4 w-4" />With Kaaval enforcement</div>
                  <div className="mb-2 flex flex-wrap items-center gap-2"><Icon className={`h-5 w-5 ${g.outcome === "blocked" ? "text-rose-400" : g.outcome === "pending_approval" ? "text-amber-400" : "text-emerald-400"}`} /><Pill v={g.outcome} label={g.outcome === "allowed" ? (g.executed ? "ALLOWED · EXECUTED" : "ALLOWED") : g.outcome === "blocked" ? "BLOCKED" : "PENDING APPROVAL"} /><Mono>{g.rule}</Mono></div>
                  <p className="text-sm text-slate-200">{g.reason}</p>
                  {g.privacy?.count > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{g.privacy.findings.slice(0, 6).map((f: any, k: number) => <span key={k} className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-200">{f.type} {f.masked} · {f.severity}</span>)}</div>}
                  {g.result && <p className="mt-2 rounded-lg bg-black/30 p-2 font-mono text-[11px] text-slate-300">{g.result.output}</p>}
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500"><ScrollText className="h-3.5 w-3.5" />{g.auditEventIds.length} audit event(s) recorded{g.approvalId && <> · approval <Mono>{g.approvalId}</Mono></>}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {r.summary && <div className="glass p-4"><div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Generated summary (written to output/)</div><pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-200">{r.summary}</pre></div>}
    </div>
  );
}
