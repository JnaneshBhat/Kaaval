# Architecture

```mermaid
flowchart LR
  U[User task] --> P[Task Passport]
  P --> A[Simulated agent<br/>proposes only]
  A -->|structured action| G{Security Gateway<br/>src/gateway/execute-action.ts}
  G --> V[Zod schema validation]
  V --> Z[Policy engine: task, action, path, recipient]
  Z --> R[Privacy guard]
  R --> AP{Approval needed?}
  AP -->|yes| Q[(Approval store)]
  AP -->|no / valid| T[Sandboxed mock tools]
  G --> L[(Hash-chained audit log)]
  T --> L
```

## Decision order (policy-engine.ts)
1. Task exists and is active → else block. 2. Explicit deny → block. 3. Not in permitted list → block (deny-by-default).
4. Path actions: sandbox boundary → allowed paths → write scope. 5. Outbound: recipient allowlist → privacy scan → block / require approval / allow.
6. `approvalRequired` → require approval. 7. Otherwise allow.

## Approval lifecycle
`pending → approved → consumed` (or `rejected | expired | invalidated`). The gateway re-runs policy + privacy, recomputes the payload hash, and consumes the approval with a conditional update (`WHERE status='approved'`) so concurrent replays lose the race.

## Layers
`app/` + `components/` = frontend. `app/api/` = thin HTTP layer. `src/` = server-only logic. `src/store/` has a `Store` interface with `PrismaStore` (app) and `MemoryStore` (tests).
