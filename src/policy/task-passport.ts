import { z } from "zod";

export const ACTION_TYPES = [
  "read_file",
  "summarize_invoice",
  "create_summary",
  "send_email",
  "export_data",
  "delete_file",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const PrivacyModeSchema = z.enum(["block", "require_approval", "allow"]);

export const TaskPassportConfigSchema = z.object({
  permittedActions: z.array(z.enum(ACTION_TYPES)),
  deniedActions: z.array(z.enum(ACTION_TYPES)),
  allowedPaths: z.array(z.string().min(1).max(200)),
  allowedRecipients: z.array(z.string().min(3).max(200)),
  sensitiveDataPolicy: z.object({
    onOutboundFinding: PrivacyModeSchema,
    minSeverity: z.enum(["low", "medium", "high"]).default("medium"),
  }),
  approvalRequired: z.array(z.enum(ACTION_TYPES)),
});
export type TaskPassportConfig = z.infer<typeof TaskPassportConfigSchema>;

export const TaskPassportInputSchema = z.object({
  name: z.string().min(3).max(100),
  objective: z.string().min(5).max(500),
  config: TaskPassportConfigSchema,
});
export type TaskPassportInput = z.infer<typeof TaskPassportInputSchema>;

export interface TaskPassport {
  id: string;
  name: string;
  objective: string;
  status: "active" | "inactive";
  config: TaskPassportConfig;
  createdAt: Date;
  updatedAt: Date;
}

export const TASK_ID_RE = /^[a-zA-Z0-9_-]{3,64}$/;

export const INVOICE_TASK_CONFIG: TaskPassportConfig = {
  permittedActions: ["read_file", "summarize_invoice", "create_summary"],
  deniedActions: ["send_email", "export_data", "delete_file"],
  allowedPaths: ["invoices/", "output/"],
  allowedRecipients: [],
  sensitiveDataPolicy: { onOutboundFinding: "block", minSeverity: "medium" },
  approvalRequired: [],
};
