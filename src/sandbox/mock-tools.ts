import fs from "node:fs";
import path from "node:path";
import { resolveInSandbox } from "./path-guard";

// Fixed reference date keeps the demo deterministic.
export const DEMO_AS_OF = "2026-10-15";

export interface ToolResult { ok: boolean; output: string; data?: unknown; simulated?: boolean }

export interface InvoiceFields {
  file: string; invoiceNo: string; customer: string; amount: number; dueDate: string; status: string; overdue: boolean; daysOverdue: number;
}

export function parseInvoice(file: string, text: string): InvoiceFields {
  const get = (k: string) => new RegExp(`^${k}:\\s*(.+)$`, "mi").exec(text)?.[1]?.trim() ?? "";
  const dueDate = get("Due Date");
  const status = get("Status") || "Unpaid";
  const days = dueDate ? Math.floor((Date.parse(DEMO_AS_OF) - Date.parse(dueDate)) / 86400000) : 0;
  const overdue = !/paid/i.test(status.replace(/unpaid/i, "")) && days > 0;
  return { file, invoiceNo: get("Invoice No"), customer: get("Customer"), amount: Number(get("Amount \\(INR\\)").replace(/,/g, "")) || 0, dueDate, status, overdue, daysOverdue: overdue ? days : 0 };
}

function readSafe(p: string): { ok: true; text: string; rel: string } | { ok: false; error: string } {
  const c = resolveInSandbox(p);
  if (!c.ok) return { ok: false, error: c.reason };
  try { return { ok: true, text: fs.readFileSync(c.abs, "utf8").slice(0, 20000), rel: c.rel }; } catch { return { ok: false, error: "File not found in sandbox." }; }
}

export const tools = {
  read_file(p: { path: string }): ToolResult {
    const r = readSafe(p.path);
    return r.ok ? { ok: true, output: `Read ${r.rel} (${r.text.length} chars)`, data: { text: r.text } } : { ok: false, output: r.error };
  },
  summarize_invoice(p: { path: string }): ToolResult {
    const r = readSafe(p.path);
    if (!r.ok) return { ok: false, output: r.error };
    const inv = parseInvoice(r.rel, r.text);
    return { ok: true, output: `${inv.invoiceNo || r.rel}: ${inv.customer} owes INR ${inv.amount.toLocaleString("en-IN")} due ${inv.dueDate}${inv.overdue ? ` — OVERDUE by ${inv.daysOverdue}d` : ""}`, data: inv };
  },
  create_summary(p: { path: string; content: string }): ToolResult {
    const c = resolveInSandbox(p.path);
    if (!c.ok) return { ok: false, output: c.reason };
    fs.mkdirSync(path.dirname(c.abs), { recursive: true });
    fs.writeFileSync(c.abs, p.content, "utf8");
    return { ok: true, output: `Wrote summary to ${c.rel} (${p.content.length} chars)` };
  },
  send_email(p: { to: string; subject: string }): ToolResult {
    return { ok: true, simulated: true, output: `SIMULATED email to ${p.to} ("${p.subject.slice(0, 60)}") — no email provider is connected; nothing was sent.` };
  },
  export_data(p: { destination: string; data: string }): ToolResult {
    return { ok: true, simulated: true, output: `SIMULATED export of ${p.data.length} chars to ${p.destination} — nothing left this machine.` };
  },
  delete_file(p: { path: string }): ToolResult {
    const c = resolveInSandbox(p.path);
    if (!c.ok) return { ok: false, output: c.reason };
    return { ok: true, simulated: true, output: `SIMULATED deletion of ${c.rel} — logged only; no file was removed.` };
  },
} as const;

export function listSandbox(dir: string): string[] {
  const c = resolveInSandbox(dir);
  if (!c.ok) return [];
  try { return fs.readdirSync(c.abs).filter((f) => !f.startsWith(".")).sort(); } catch { return []; }
}
