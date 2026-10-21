// Heuristic indirect-prompt-injection detector for UNTRUSTED document text.
// It informs the user; it is never a security boundary (the gateway is).
const RULES: { id: string; re: RegExp; weight: number; label: string }[] = [
  { id: "override", re: /ignore (all |your )?(previous|prior|above) (instructions|rules)/i, weight: 40, label: "Instruction-override phrase" },
  { id: "addressing_ai", re: /(system note|assistant:|to (the )?ai|note to (ai|assistant)|you are now)/i, weight: 20, label: "Text addressing the AI agent" },
  { id: "exfil_email", re: /\b(e-?mail|send|forward)\b[^.\n]{0,60}\bto\b[^.\n]{0,40}[\w.+-]+@[\w-]+\.[\w.]+/i, weight: 35, label: "Exfiltration request (email)" },
  { id: "exfil_export", re: /\bexport\b[^.\n]{0,60}\bto\b\s+[\w.-]+\.[a-z]{2,}/i, weight: 30, label: "Exfiltration request (export)" },
  { id: "destructive", re: /\b(delete|erase|wipe|remove|destroy)\b[^.\n]{0,40}\b(invoices?|files?|backups?)\b/i, weight: 35, label: "Destructive instruction" },
  { id: "secrecy", re: /(do not|don't|never) tell the user/i, weight: 25, label: "Concealment instruction" },
  { id: "path_probe", re: /\.\.\/|\/etc\/passwd/i, weight: 30, label: "Path-traversal probe" },
  { id: "urgency", re: /(highest priority|immediately|maintenance mode)/i, weight: 10, label: "Urgency / privilege claim" },
];

export interface InjectionScan { score: number; level: "clean" | "suspicious" | "malicious"; matches: { id: string; label: string; excerpt: string }[] }

export function scanDocumentForInjection(text: string): InjectionScan {
  const matches = RULES.flatMap((r) => { const m = r.re.exec(text); return m ? [{ id: r.id, label: r.label, excerpt: m[0].slice(0, 120) }] : []; });
  const score = Math.min(100, RULES.filter((r) => matches.some((m) => m.id === r.id)).reduce((a, r) => a + r.weight, 0));
  return { score, level: score >= 50 ? "malicious" : score >= 20 ? "suspicious" : "clean", matches };
}
