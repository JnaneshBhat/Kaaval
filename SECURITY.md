# Security model — Kaaval (prototype)

## Threat model
Primary threat: **indirect prompt injection** — untrusted document text tries to make an agent exceed the permissions of its task (exfiltration, deletion, out-of-scope actions, sandbox escape, approval abuse).

## What enforces security
Only the server-side gateway (`src/gateway/execute-action.ts`) + deterministic policy engine. Prompts, UI visibility and warnings are **not** security boundaries. Document text is data, never authorization.

## Controls
Zod schemas per action · deny-by-default + explicit-deny-wins · task ownership/active checks · sandbox path guard (`..`, encoded traversal, absolute paths, backslashes, null bytes, symlinks) · recipient allowlist · heuristic privacy guard · one-time approvals bound to a SHA-256 of the canonical payload, atomic compare-and-set consumption, expiry, invalidation on passport change · audit event for every decision incl. denials, hash-chained, masked values only.

## Limitations (be honest)
- Prototype: no user authentication/RBAC — anyone with access to the UI is the "authorized user". Add auth before any real use.
- Tools are **mocks**: email/export/delete are simulated; there is no real provider.
- Privacy detectors are regex heuristics: they can miss data and produce false positives; a match is **not** proof of an Aadhaar/bank number.
- The simulated agent is deterministic; real LLM agents were not tested.
- SQLite + single process: approval consumption is atomic via a conditional update, but multi-node deployments need a proper DB. The audit hash chain is tamper-*evident*, not tamper-proof (an attacker with DB write access can rewrite the whole chain).
- Approval records keep the full action payload server-side (needed to execute after approval); the UI and audit log only show masked values.
- No rate limiting, CSRF protection or TLS termination is provided.
