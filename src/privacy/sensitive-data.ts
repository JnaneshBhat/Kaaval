// Heuristic, local, deterministic detectors. NOT a complete or verified PII solution.
export type Severity = "low" | "medium" | "high";
export interface Finding {
  type: "email" | "phone_in" | "aadhaar_like" | "bank_account_like" | "ifsc_like";
  field: string;
  severity: Severity;
  masked: string; // never the full value
  note: string;
}

const SEV_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3 };
export const severityAtLeast = (s: Severity, min: Severity) => SEV_RANK[s] >= SEV_RANK[min];

function mask(v: string): string {
  const clean = v.replace(/\s|-/g, "");
  if (clean.length <= 4) return "****";
  return "*".repeat(Math.max(clean.length - 3, 2)) + clean.slice(-3);
}

const DETECTORS: { type: Finding["type"]; re: RegExp; severity: Severity; note: string }[] = [
  { type: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, severity: "medium", note: "Email-address pattern" },
  { type: "ifsc_like", re: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g, severity: "medium", note: "IFSC-like code pattern" },
  { type: "aadhaar_like", re: /\b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b/g, severity: "high", note: "12-digit Aadhaar-like pattern (unverified)" },
  { type: "phone_in", re: /(?:\+91[ -]?|\b0)?\b[6-9]\d{9}\b/g, severity: "medium", note: "Indian mobile-number-like pattern" },
  { type: "bank_account_like", re: /\b\d{9,18}\b/g, severity: "high", note: "9-18 digit account-like number (unverified)" },
];

export function scanText(text: string, field = "content"): Finding[] {
  const findings: Finding[] = [];
  const consumed: [number, number][] = [];
  for (const d of DETECTORS) {
    d.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = d.re.exec(text)) !== null) {
      const s = m.index, e = s + m[0].length;
      if (consumed.some(([a, b]) => s < b && e > a)) continue;
      consumed.push([s, e]);
      findings.push({ type: d.type, field, severity: d.severity, masked: mask(m[0]), note: d.note });
    }
  }
  return findings;
}

export function scanPayload(payload: unknown, prefix = "payload"): Finding[] {
  if (payload == null) return [];
  if (typeof payload === "string") return scanText(payload, prefix);
  if (typeof payload === "number") return scanText(String(payload), prefix);
  if (Array.isArray(payload)) return payload.flatMap((v, i) => scanPayload(v, `${prefix}[${i}]`));
  if (typeof payload === "object")
    return Object.entries(payload as Record<string, unknown>).flatMap(([k, v]) => scanPayload(v, `${prefix}.${k}`));
  return [];
}

export function summarizeFindings(f: Finding[]) {
  const byType: Record<string, number> = {};
  for (const x of f) byType[x.type] = (byType[x.type] ?? 0) + 1;
  const maxSeverity = f.reduce<Severity | null>((a, x) => (!a || SEV_RANK[x.severity] > SEV_RANK[a] ? x.severity : a), null);
  return { count: f.length, byType, maxSeverity, findings: f };
}
export type PrivacyScan = ReturnType<typeof summarizeFindings>;

// Returns text with suspected sensitive values masked (for UI previews).
export function redactText(text: string): string {
  let out = text;
  for (const d of DETECTORS) {
    d.re.lastIndex = 0;
    out = out.replace(d.re, (m) => mask(m));
  }
  return out;
}
