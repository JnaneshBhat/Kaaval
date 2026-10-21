# Contributing
1. Fork and branch from `main`. 2. `npm run setup` then `npm test` and `npm run typecheck` before opening a PR.
3. Any new tool MUST be registered in `src/sandbox/mock-tools.ts` and reachable only through `src/gateway/execute-action.ts`.
4. Add a test in `tests/` for every new policy rule.
