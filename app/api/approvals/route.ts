import { getStore } from "@/src/store/prisma-store";
import { previewApproval } from "@/src/gateway/approval-service";
import { ok, handle } from "@/src/lib/api";
export const dynamic = "force-dynamic";

export const GET = (req: Request) => handle(async () => {
  const status = new URL(req.url).searchParams.get("status") ?? undefined;
  const valid = ["pending", "approved", "rejected", "consumed", "expired", "invalidated"];
  const list = await getStore().listApprovals(status && valid.includes(status) ? (status as any) : undefined);
  return ok({ approvals: list.map(previewApproval) });
});
