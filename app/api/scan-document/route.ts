import { z } from "zod";
import { scanDocumentForInjection } from "@/src/agent/injection-scanner";
import { scanText } from "@/src/privacy/sensitive-data";
import { ok, fail, readJson, handle } from "@/src/lib/api";
export const dynamic = "force-dynamic";

export const POST = (req: Request) => handle(async () => {
  const p = z.object({ text: z.string().min(1).max(20000) }).safeParse(await readJson(req));
  if (!p.success) return fail(400, "validation_error", "text required (max 20k chars)", p.error.issues);
  return ok({ injection: scanDocumentForInjection(p.data.text), privacy: scanText(p.data.text, "document") });
});
