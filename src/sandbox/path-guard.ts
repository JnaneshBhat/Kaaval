import path from "node:path";
import fs from "node:fs";

export function sandboxRoot(): string {
  return path.resolve(process.env.KAAVAL_SANDBOX_DIR ?? "./sandbox-data");
}

export type PathCheck = { ok: true; abs: string; rel: string } | { ok: false; reason: string };

// Rejects traversal, encoded traversal, absolute paths, null bytes, backslashes and symlink escapes.
export function resolveInSandbox(input: string, root = sandboxRoot()): PathCheck {
  let p = input;
  try {
    for (let i = 0; i < 3; i++) { const d = decodeURIComponent(p); if (d === p) break; p = d; }
  } catch { return { ok: false, reason: "Undecodable path." }; }
  if (p.includes("\0")) return { ok: false, reason: "Null byte in path." };
  if (p.includes("\\")) return { ok: false, reason: "Backslashes are not permitted." };
  if (path.isAbsolute(p) || /^[a-zA-Z]:/.test(p)) return { ok: false, reason: "Absolute paths are not permitted." };
  if (p.split("/").some((s) => s === "..")) return { ok: false, reason: "Path traversal (..) detected." };
  const abs = path.resolve(root, p);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (abs !== root && !abs.startsWith(rootWithSep)) return { ok: false, reason: "Path escapes the sandbox." };
  let probe = abs;
  while (!fs.existsSync(probe) && probe !== root) probe = path.dirname(probe);
  try {
    const real = fs.realpathSync(probe);
    const realRoot = fs.realpathSync(root);
    if (real !== realRoot && !real.startsWith(realRoot + path.sep)) return { ok: false, reason: "Symlink escapes the sandbox." };
  } catch { /* missing sandbox handled by tools */ }
  return { ok: true, abs, rel: path.relative(root, abs).split(path.sep).join("/") };
}

export function pathAllowed(rel: string, allowed: string[]): boolean {
  return allowed.some((a) => {
    const base = a.replace(/\/$/, "");
    return rel === base || rel.startsWith(base + "/");
  });
}
