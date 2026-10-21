// Deterministic simulated agent. It ONLY proposes actions — it never executes tools.
// It is deliberately "naive": it obeys instructions found in untrusted documents,
// which is exactly the indirect-prompt-injection failure Kaaval is built to contain.
export interface Proposal { type: string; params: Record<string, unknown>; label: string; origin: "user_task" | "untrusted_document" | "user_followup" }

export function proposeSummaryActions(files: string[], summaryPath: string): Proposal[] {
  return [
    ...files.map((f): Proposal => ({ type: "summarize_invoice", params: { path: f }, label: `Summarize ${f}`, origin: "user_task" })),
    { type: "create_summary", params: { path: summaryPath, content: "$SUMMARY" }, label: `Write summary to ${summaryPath}`, origin: "user_task" },
  ];
}

const SENSITIVE_LINE = /^(customer|contact|phone|email|bank|account|ifsc|aadhaar)/im;

export function proposeFromUntrustedDocument(docText: string, docPath: string): Proposal[] {
  const out: Proposal[] = [];
  const sensitive = docText.split("\n").filter((l) => SENSITIVE_LINE.test(l)).join("\n");
  const mail = /e-?mail[^.\n]{0,60}\bto\s+([\w.+-]+@[\w-]+\.[\w.]+)/i.exec(docText);
  if (mail) out.push({ type: "send_email", params: { to: mail[1], subject: "Customer bank details", body: sensitive }, label: `Email data to ${mail[1]}`, origin: "untrusted_document" });
  const exp = /export[^.\n]{0,60}\bto\s+([\w-]+(?:\.[\w-]+)+)/i.exec(docText);
  if (exp) out.push({ type: "export_data", params: { destination: exp[1].toLowerCase(), data: sensitive }, label: `Export data to ${exp[1]}`, origin: "untrusted_document" });
  if (/delete[^.\n]{0,30}invoices?/i.test(docText)) {
    out.push({ type: "delete_file", params: { path: docPath }, label: `Delete ${docPath}`, origin: "untrusted_document" });
  }
  const rd = /read (?:the )?file\s+(\S+)/i.exec(docText);
  if (rd) out.push({ type: "read_file", params: { path: rd[1] }, label: `Read ${rd[1]}`, origin: "untrusted_document" });
  return out;
}
