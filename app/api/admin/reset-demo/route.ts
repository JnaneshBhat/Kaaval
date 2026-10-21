import { getStore } from "@/src/store/prisma-store";
import { seedDemoData } from "@/src/lib/seed";
import { ok, fail, handle } from "@/src/lib/api";
export const dynamic = "force-dynamic";

// User-initiated demo reset (re-seeds deterministic data). Disabled in production unless explicitly enabled.
export const POST = () => handle(async () => {
  if (process.env.NODE_ENV === "production" && process.env.KAAVAL_ALLOW_RESET !== "true") return fail(403, "disabled", "Reset is disabled in production builds. Set KAAVAL_ALLOW_RESET=true to enable.");
  return ok({ seeded: await seedDemoData(getStore()) });
});
