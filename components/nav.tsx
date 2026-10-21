"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, LayoutDashboard, FileLock2, Swords, ClipboardCheck, ScrollText, PlayCircle, FlaskConical, Settings } from "lucide-react";

export const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/tasks", label: "Task Passport", icon: FileLock2 },
  { href: "/attack-lab", label: "Attack Lab", icon: Swords },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/audit", label: "Audit Log", icon: ScrollText },
  { href: "/execution", label: "Task Run", icon: PlayCircle },
  { href: "/policy-lab", label: "Policy Lab", icon: FlaskConical },
  { href: "/settings", label: "System", icon: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-ink-950/60 p-4 backdrop-blur-xl lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-500 to-cyan-400 shadow-lg shadow-indigo-900/60 animate-floaty"><ShieldCheck className="h-6 w-6 text-white" /></div>
          <div><div className="text-xl font-extrabold tracking-tight grad-text">Kaaval</div><div className="text-[11px] text-slate-400">Security Guard for AI Agents</div></div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active(href) ? "bg-gradient-to-r from-violet-600/40 to-cyan-500/20 text-white ring-1 ring-white/15" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
              <Icon className="h-[18px] w-[18px]" />{label}
            </Link>
          ))}
        </nav>
        <div className="glass p-3 text-[11px] leading-relaxed text-slate-400"><span className="font-bold text-emerald-300">● Enforcement ON</span><br />Deterministic demo mode. No external AI or email provider connected.</div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/10 bg-ink-950/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <ShieldCheck className="h-6 w-6 text-cyan-300" /><span className="text-lg font-extrabold grad-text">Kaaval</span>
          <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">ENFORCING</span>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t border-white/10 bg-ink-950/90 px-2 py-1.5 backdrop-blur-xl lg:hidden">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-semibold ${active(href) ? "bg-white/10 text-cyan-300" : "text-slate-400"}`}><Icon className="h-5 w-5" />{label}</Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
