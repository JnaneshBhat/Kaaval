import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node", env: { KAAVAL_SANDBOX_DIR: "./sandbox-data", KAAVAL_APPROVAL_TTL_MINUTES: "15" } },
});
