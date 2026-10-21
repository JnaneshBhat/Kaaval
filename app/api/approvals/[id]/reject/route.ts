import { getStore } from "@/src/store/prisma-store";
import { decideApproval } from "@/src/gateway/approval-service";
import { ok, fail, handle } from "@/src/lib/api";
export const dynamic = "force-dynamic";

export const POST = (_: Request, { params }: { params: { id: string } }) => handle(async () => {
  const d = await decideApproval(getStore(), params.id, "reject");
  return d.ok ? ok({ approvalId: params.id, status: "rejected" }) : fail(d.status, "approval_error", d.reason);
});
