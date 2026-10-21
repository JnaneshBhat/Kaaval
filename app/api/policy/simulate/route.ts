import { getStore } from "@/src/store/prisma-store";
import { executeAction } from "@/src/gateway/execute-action";
import { ok, fail, readJson, handle } from "@/src/lib/api";
export const dynamic = "force-dynamic";

// Dry run: full policy + privacy evaluation, no execution, no audit event, no approval created.
export const POST = (req: Request) => handle(async () => {
  const body = await readJson(req);
  if (body === undefined) return fail(400, "bad_json", "Body must be JSON.");
  return ok({ dryRun: true, ...(await executeAction(getStore(), body, { dryRun: true })) });
});
