import { getStore } from "@/src/store/prisma-store";
import { decideApproval } from "@/src/gateway/approval-service";
import { executeAction } from "@/src/gateway/execute-action";
import { ok, fail, handle } from "@/src/lib/api";
export const dynamic = "force-dynamic";

// Approve, then run the exact stored action back through the gateway (which re-checks policy and consumes the approval).
export const POST = (_: Request, { params }: { params: { id: string } }) => handle(async () => {
  const s = getStore();
  const d = await decideApproval(s, params.id, "approve");
  if (!d.ok) return fail(d.status, "approval_error", d.reason);
  const a = d.approval;
  const exec = await executeAction(s, { taskId: a.taskId, type: a.actionType, params: JSON.parse(a.payloadJson), approvalId: a.id, requester: "approval-center" });
  return ok({ approvalId: a.id, execution: exec });
});
