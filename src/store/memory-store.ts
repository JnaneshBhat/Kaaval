import type { Store, AuditRecord, ApprovalRecord, NewAudit, AuditFilter, ApprovalStatus } from "./types";
import type { TaskPassport, TaskPassportInput } from "../policy/task-passport";
import { newId } from "./hash";
import { chainHash } from "../audit/chain";

// In-memory Store. Used by the test-suite; behaviour mirrors PrismaStore (incl. atomic compare-and-set).
export class MemoryStore implements Store {
  tasks = new Map<string, TaskPassport>();
  audit: AuditRecord[] = [];
  approvals = new Map<string, ApprovalRecord>();
  runs: unknown[] = [];

  async getTask(id: string) { return this.tasks.get(id) ?? null; }
  async listTasks() { return [...this.tasks.values()]; }
  async createTask(id: string, input: TaskPassportInput) {
    const now = new Date();
    const t: TaskPassport = { id, name: input.name, objective: input.objective, status: "active", config: input.config, createdAt: now, updatedAt: now };
    this.tasks.set(id, t);
    return t;
  }
  async updateTask(id: string, patch: any) {
    const t = this.tasks.get(id);
    if (!t) return null;
    Object.assign(t, patch, { updatedAt: new Date() });
    return t;
  }
  async addAudit(e: NewAudit) {
    const prev = this.audit[this.audit.length - 1]?.hash ?? "GENESIS";
    const base = { ...e, id: newId("evt"), timestamp: new Date(), prevHash: prev };
    const rec: AuditRecord = { ...base, hash: chainHash(base) };
    this.audit.push(rec);
    return rec;
  }
  async listAudit(f: AuditFilter = {}) {
    let r = [...this.audit].reverse();
    if (f.decision) r = r.filter((x) => x.decision === f.decision);
    if (f.taskId) r = r.filter((x) => x.taskId === f.taskId);
    if (f.source) r = r.filter((x) => x.source === f.source);
    if (f.q) { const q = f.q.toLowerCase(); r = r.filter((x) => (x.action + x.resource + x.rule + x.reason).toLowerCase().includes(q)); }
    return r.slice(0, f.limit ?? 200);
  }
  async allAuditAscending() { return [...this.audit]; }
  async createApproval(a: any) {
    const rec: ApprovalRecord = { ...a, createdAt: new Date(), decidedAt: null, consumedAt: null };
    this.approvals.set(rec.id, rec);
    return rec;
  }
  async getApproval(id: string) { return this.approvals.get(id) ?? null; }
  async listApprovals(status?: ApprovalStatus) {
    return [...this.approvals.values()].filter((a) => !status || a.status === status).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async findPendingApproval(taskId: string, hash: string) {
    return [...this.approvals.values()].find((a) => a.taskId === taskId && a.payloadHash === hash && a.status === "pending") ?? null;
  }
  async setApprovalStatus(id: string, from: ApprovalStatus[], to: ApprovalStatus) {
    const a = this.approvals.get(id);
    if (!a || !from.includes(a.status)) return false; // single-threaded JS => atomic
    a.status = to;
    if (to === "approved" || to === "rejected") a.decidedAt = new Date();
    if (to === "consumed") a.consumedAt = new Date();
    return true;
  }
  async invalidateOpenApprovals(taskId: string) {
    let n = 0;
    for (const a of this.approvals.values()) if (a.taskId === taskId && (a.status === "pending" || a.status === "approved")) { a.status = "invalidated"; n++; }
    return n;
  }
  async addScenarioRun(r: any) { this.runs.push(r); }
  async countScenarioRuns() { return this.runs.length; }
  async reset() { this.tasks.clear(); this.audit = []; this.approvals.clear(); this.runs = []; }
}
