"use client";
import { useState } from "react";
import { ClipboardCheck, Check, X, ShieldQuestion } from "lucide-react";
import { api, useApi } from "@/components/client";
import { PageHeader, Loading, ErrorBox, Empty, Pill, Mono, fmtTime } from "@/components/ui";

export default function Approvals() {
  const { data, error, loading, reload } = useApi<any>("/api/approvals");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, kind: "approve" | "reject") {
    setBusy(id); setMsg(null);
    try {
      const d = await api(`/api/approvals/${id}/${kind}`, { method: "POST" });
      setMsg(kind === "reject" ? { ok: true, text: "Request rejected and logged." } : { ok: d.execution?.executed, text: d.execution?.executed ? `Approved and executed once: ${d.execution.result?.output}` : `Approved but gateway refused: ${d.execution?.reason}` });
    } catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(null); reload(); }
  }
  const list: any[] = data?.approvals ?? [];
  const pending = list.filter((a) => a.status === "pending"), rest = list.filter((a) => a.status !== "pending");
  return (
    <>
      <PageHeader title="Approval Center" sub="Sensitive actions wait here. Approvals are stored server-side, bound to a hash of the exact payload, single-use, and expire automatically." icon={<ClipboardCheck className="h-6 w-6 text-white" />} />
      {msg && <div className={`glass mb-4 p-3 text-sm ${msg.ok ? "border-emerald-400/40 text-emerald-200" : "border-rose-400/40 text-rose-200"}`}>{msg.text}</div>}
      {loading && <Loading />}{error && <ErrorBox msg={error} />}
      {!loading && pending.length === 0 && <Empty text="Nothing awaiting approval. Run Attack Lab scenario 4 to generate a request." />}
      <div className="grid gap-4 md:grid-cols-2">
        {pending.map((a) => (
          <div key={a.id} className="glass border-amber-400/40 p-5 animate-pop" data-testid="pending-approval">
            <div className="mb-3 flex items-center gap-2"><ShieldQuestion className="h-5 w-5 text-amber-300" /><b>{a.actionType}</b><Pill v="pending" /><span className="ml-auto text-[11px] text-slate-500">{fmtTime(a.createdAt)}</span></div>
            <dl className="space-y-1.5 text-sm">
              <div><dt className="label !mb-0">Resource</dt><dd><Mono>{a.resource}</Mono></dd></div>
              {a.recipient && <div><dt className="label !mb-0">Recipient</dt><dd><Mono>{a.recipient}</Mono></dd></div>}
              <div><dt className="label !mb-0">Requested by</dt><dd>{a.requester} · task <Mono>{a.taskId}</Mono></dd></div>
              <div><dt className="label !mb-0">Why escalated</dt><dd className="text-amber-200">{a.reason}</dd></div>
              <div><dt className="label !mb-0">Payload (sensitive values masked)</dt><dd><pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 font-mono text-[11px] text-slate-300">{JSON.stringify(a.preview, null, 2)}</pre></dd></div>
              <div className="text-[11px] text-slate-500">Bound to hash <Mono>{a.payloadHash.slice(0, 16)}…</Mono> · expires {fmtTime(a.expiresAt)}</div>
            </dl>
            <div className="mt-4 flex gap-2"><button className="btn-ok flex-1" disabled={busy === a.id} onClick={() => decide(a.id, "approve")} data-testid="approve"><Check className="h-4 w-4" />Approve once</button><button className="btn-danger flex-1" disabled={busy === a.id} onClick={() => decide(a.id, "reject")}><X className="h-4 w-4" />Reject</button></div>
          </div>))}
      </div>
      {rest.length > 0 && <><h2 className="mb-3 mt-8 font-bold text-slate-300">History</h2>
        <div className="glass divide-y divide-white/10">{rest.map((a) => <div key={a.id} className="flex flex-wrap items-center gap-3 p-3 text-sm"><Pill v={a.status} /><Mono>{a.actionType}</Mono><span className="min-w-0 flex-1 truncate text-slate-400">{a.resource}</span><span className="text-[11px] text-slate-500">{fmtTime(a.createdAt)}</span></div>)}</div></>}
    </>
  );
}
