import { PrismaClient } from "@prisma/client";
import type { Store, AuditRecord, ApprovalRecord, NewAudit, AuditFilter, ApprovalStatus } from "./types";
import type { TaskPassport, TaskPassportInput } from "../policy/task-passport";
import { newId } from "./hash";
import { chainHash } from "../audit/chain";

const g = globalThis as unknown as { __prisma?: PrismaClient };
export const prisma = g.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.__prisma = prisma;

const toTask = (r: any): TaskPassport => ({ ...r, config: JSON.parse(r.config) });
const toAudit = (r: any): AuditRecord => r;
const toApproval = (r: any): ApprovalRecord => r;

export class PrismaStore implements Store {
  async getTask(id: string) { const r = await prisma.taskPassport.findUnique({ where: { id } }); return r ? toTask(r) : null; }
  async listTasks() { return (await prisma.taskPassport.findMany({ orderBy: { createdAt: "asc" } })).map(toTask); }
  async createTask(id: string, input: TaskPassportInput) {
    return toTask(await prisma.taskPassport.create({ data: { id, name: input.name, objective: input.objective, status: "active", config: JSON.stringify(input.config) } }));
  }
  async updateTask(id: string, patch: any) {
    const data: any = {};
    if (patch.status) data.status = patch.status;
    if (patch.name) data.name = patch.name;
    if (patch.objective) data.objective = patch.objective;
    if (patch.config) data.config = JSON.stringify(patch.config);
    try { return toTask(await prisma.taskPassport.update({ where: { id }, data })); } catch { return null; }
  }
  // Serialized in a transaction so the hash chain stays linear.
  async addAudit(e: NewAudit) {
    return prisma.$transaction(async (tx) => {
      const last = await tx.auditEvent.findFirst({ orderBy: [{ timestamp: "desc" }, { id: "desc" }] });
      const base = { ...e, id: newId("evt"), timestamp: new Date(), prevHash: last?.hash ?? "GENESIS" };
      const rec = { ...base, hash: chainHash(base as any) };
      await tx.auditEvent.create({ data: rec });
      return toAudit(rec);
    });
  }
  async listAudit(f: AuditFilter = {}) {
    const where: any = {};
    if (f.decision) where.decision = f.decision;
    if (f.taskId) where.taskId = f.taskId;
    if (f.source) where.source = f.source;
    if (f.q) where.OR = ["action", "resource", "rule", "reason"].map((k) => ({ [k]: { contains: f.q } }));
    return (await prisma.auditEvent.findMany({ where, orderBy: [{ timestamp: "desc" }, { id: "desc" }], take: f.limit ?? 200 })).map(toAudit);
  }
  async allAuditAscending() { return (await prisma.auditEvent.findMany({ orderBy: [{ timestamp: "asc" }, { id: "asc" }] })).map(toAudit); }
  async createApproval(a: any) { return toApproval(await prisma.approval.create({ data: a })); }
  async getApproval(id: string) { const r = await prisma.approval.findUnique({ where: { id } }); return r ? toApproval(r) : null; }
  async listApprovals(status?: ApprovalStatus) { return (await prisma.approval.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" } })).map(toApproval); }
  async findPendingApproval(taskId: string, payloadHash: string) {
    const r = await prisma.approval.findFirst({ where: { taskId, payloadHash, status: "pending" } });
    return r ? toApproval(r) : null;
  }
  // Atomic compare-and-set: only one concurrent caller can flip the status.
  async setApprovalStatus(id: string, from: ApprovalStatus[], to: ApprovalStatus) {
    const data: any = { status: to };
    if (to === "approved" || to === "rejected") data.decidedAt = new Date();
    if (to === "consumed") data.consumedAt = new Date();
    const r = await prisma.approval.updateMany({ where: { id, status: { in: from } }, data });
    return r.count === 1;
  }
  async invalidateOpenApprovals(taskId: string) {
    return (await prisma.approval.updateMany({ where: { taskId, status: { in: ["pending", "approved"] } }, data: { status: "invalidated" } })).count;
  }
  async addScenarioRun(r: { scenarioId: string; taskId: string; outcome: unknown }) {
    await prisma.scenarioRun.create({ data: { id: newId("run"), scenarioId: r.scenarioId, taskId: r.taskId, outcomeJson: JSON.stringify(r.outcome) } });
  }
  async countScenarioRuns() { return prisma.scenarioRun.count(); }
  async reset() {
    await prisma.$transaction([prisma.scenarioRun.deleteMany(), prisma.auditEvent.deleteMany(), prisma.approval.deleteMany(), prisma.taskPassport.deleteMany()]);
  }
}

let _store: Store | null = null;
export function getStore(): Store { return (_store ??= new PrismaStore()); }
