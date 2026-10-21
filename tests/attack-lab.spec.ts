import { test, expect } from "@playwright/test";

// Requires: npm run setup && npm run dev (see playwright.config.ts)
test("Attack Lab runs a scenario and shows the real backend decision", async ({ page }) => {
  await page.goto("/attack-lab");
  await page.getByTestId("scenario-s2-exfil").click();
  await page.getByTestId("run-scenario").click();
  await expect(page.getByText("BLOCKED").first()).toBeVisible();
  await expect(page.getByText("explicit_deny").first()).toBeVisible();
});
