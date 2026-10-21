import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok(data: unknown, status = 200) { return NextResponse.json(data, { status }); }
export function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}
export async function readJson(req: Request): Promise<unknown | undefined> {
  try { return await req.json(); } catch { return undefined; }
}
// Consistent error envelope for every route.
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try { return await fn(); } catch (e) {
    if (e instanceof ZodError) return fail(400, "validation_error", "Invalid input", e.issues);
    console.error("[kaaval] route error:", e);
    return fail(500, "internal_error", "Database or server error. Did you run `npm run setup`?");
  }
}
