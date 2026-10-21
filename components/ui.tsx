import { Loader2, AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

const PILL: Record<string, string> = {
  allowed: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40",
  executed: "bg-sky-500/15 text-sky-300 ring-sky-400/40",
  blocked: "bg-rose-500/15 text-rose-300 ring-rose-400/40",
  pending_approval: "bg-amber-500/15 text-amber-300 ring-amber-400/40",
  pending: "bg-amber-500/15 text-amber-300 ring-amber-400/40",
  approved: "bg-teal-500/15 text-teal-300 ring-teal-400/40",
  rejected: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/40",
  consumed: "bg-slate-500/20 text-slate-300 ring-slate-400/30",
  invalidated: "bg-rose-500/15 text-rose-300 ring-rose-400/40",
  expired: "bg-slate-500/20 text-slate-300 ring-slate-400/30",
  active: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40",
  inactive: "bg-slate-500/20 text-slate-300 ring-slate-400/30",
  live: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/40",
  "attack-lab": "bg-violet-500/15 text-violet-300 ring-violet-400/40",
  seed: "bg-slate-500/20 text-slate-300 ring-slate-400/30",
};
export function Pill({ v, label }: { v: string; label?: string }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${PILL[v] ?? PILL.seed}`}>{label ?? v.replace("_", " ")}</span>;
}
export function PageHeader({ title, sub, icon, children }: { title: string; sub: string; icon?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 animate-pop">
      <div className="flex items-start gap-3">
        {icon && <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-lg shadow-indigo-900/50">{icon}</div>}
        <div><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1><p className="mt-1 max-w-2xl text-sm text-slate-400">{sub}</p></div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
export const Loading = ({ text = "Loading…" }: { text?: string }) => <div className="flex items-center gap-2 p-6 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />{text}</div>;
export const ErrorBox = ({ msg }: { msg: string }) => <div className="glass flex items-start gap-3 border-rose-400/30 p-4 text-sm text-rose-200"><AlertTriangle className="h-5 w-5 shrink-0" /><div><b>Something went wrong.</b> {msg}<div className="mt-1 text-xs text-rose-300/70">If this is a fresh install run <code className="rounded bg-black/30 px-1">npm run setup</code> to create the database.</div></div></div>;
export const Empty = ({ text }: { text: string }) => <div className="glass flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-400"><Inbox className="h-8 w-8 text-slate-500" />{text}</div>;
export const Mono = ({ children }: { children: ReactNode }) => <code className="break-all rounded-md bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-cyan-200">{children}</code>;
export const fmtTime = (s: string) => new Date(s).toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
