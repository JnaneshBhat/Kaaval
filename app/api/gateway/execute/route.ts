import { getStore } from "@/src/store/prisma-store";
import { executeAction } from "@/src/gateway/execute-action";
import { ok, fail, readJson, handle } from "@/src/lib/api";
export const dynamic = "force-dynamic";

// Generic entry to the shared gateway. There is deliberately NO bypass route.
export const POST = (req: Request) => handle(async () => {
  const body = await readJson(req);
  if (body === undefined) return fail(400, "bad_json", "Body must be JSON.");
  const r = await executeAction(getStore(), body);
  const status = r.outcome === "blocked" ? 403 : r.outcome === "pending_approval" ? 202 : 200;
  return ok(r, status);
});
