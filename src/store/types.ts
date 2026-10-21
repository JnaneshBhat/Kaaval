import type { TaskPassport, TaskPassportInput } from "../policy/task-passport";

export type Decision = "allowed" | "blocked" | "pending_approval" | "approved" | "rejected" | "executed";

export interface AuditRecord {
  id: string;
  timestamp: Date;
  taskId: string;
  action: string;
  resource: string;
  decision: Decision;
  rule: string;
  reason: string;
  privacyJson: string;
  result: string | null;
  approvalId: string | null;
  source: "live" | "attack-lab" | "seed";
  prevHash: string;
  hash: string;
}
export type NewAudit = Omit<AuditRecord, "id" | "timestamp" | "prevHash" | "hash">;

export type ApprovalStatus = "pending" | "approved" | "rejected" | "consumed" | "expired" | "invalidated";
export interface ApprovalRecord {
  id: string;
  taskId: string;
  actionType: string;
  resource: string;
  recipient: string | null;
  payloadHash: string;
  payloadJson: string; // full params, server-side only; UI receives redacted preview
  requester: string;
  reason: string;
  status: ApprovalStatus;
  createdAt: Date;
  decidedAt: Date | null;
  consumedAt: Date | null;
  expiresAt: Date;
}

export interface AuditFilter { decision?: string; taskId?: string; q?: string; source?: string; limit?: number }

export interface Store {
  getTask(id: string): Promise<TaskPassport | null>;
  listTasks(): Promise<TaskPassport[]>;
  createTask(id: string, input: TaskPassportInput): Promise<TaskPassport>;
  updateTask(id: string, patch: { status?: "active" | "inactive"; config?: TaskPassport["config"]; name?: string; objective?: string }): Promise<TaskPassport | null>;
  addAudit(e: NewAudit): Promise<AuditRecord>;
  listAudit(f?: AuditFilter): Promise<AuditRecord[]>;
  allAuditAscending(): Promise<AuditRecord[]>;
  createApproval(a: Omit<ApprovalRecord, "createdAt" | "decidedAt" | "consumedAt">): Promise<ApprovalRecord>;
  getApproval(id: string): Promise<ApprovalRecord | null>;
  listApprovals(status?: ApprovalStatus): Promise<ApprovalRecord[]>;
  findPendingApproval(taskId: string, payloadHash: string): Promise<ApprovalRecord | null>;
  setApprovalStatus(id: string, from: ApprovalStatus[], to: ApprovalStatus): Promise<boolean>; // atomic compare-and-set
  invalidateOpenApprovals(taskId: string): Promise<number>;
  addScenarioRun(r: { scenarioId: string; taskId: string; outcome: unknown }): Promise<void>;
  countScenarioRuns(): Promise<number>;
  reset(): Promise<void>;
}
