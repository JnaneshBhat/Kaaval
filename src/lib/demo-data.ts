import type { Store } from "../store/types";
import { INVOICE_TASK_CONFIG, type TaskPassportConfig } from "../policy/task-passport";

export const TASK_INVOICE = "task-invoice-review";
export const TASK_VENDOR = "task-vendor-recon";

export const VENDOR_TASK_CONFIG: TaskPassportConfig = {
  permittedActions: ["read_file", "summarize_invoice", "create_summary", "export_data"],
  deniedActions: ["delete_file"],
  allowedPaths: ["invoices/", "output/"],
  allowedRecipients: ["audit-portal.example.com"],
  sensitiveDataPolicy: { onOutboundFinding: "require_approval", minSeverity: "medium" },
  approvalRequired: [],
};

export async function ensureDemoTasks(store: Store) {
  if (!(await store.getTask(TASK_INVOICE)))
    await store.createTask(TASK_INVOICE, { name: "Cashew invoice review", objective: "Read the uploaded invoices, summarize them, and identify overdue payments.", config: INVOICE_TASK_CONFIG });
  if (!(await store.getTask(TASK_VENDOR)))
    await store.createTask(TASK_VENDOR, { name: "Vendor reconciliation (approval flow)", objective: "Summarize invoices and share a reconciliation extract with the approved audit portal — sensitive data requires human approval.", config: VENDOR_TASK_CONFIG });
}
