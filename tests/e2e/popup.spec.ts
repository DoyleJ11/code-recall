import { expect, test, chromium, type BrowserContext } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

async function launchExtension(): Promise<{
  context: BrowserContext;
  extensionId: string;
}> {
  const extensionPath = resolve("dist");
  const userDataDir = mkdtempSync(join(tmpdir(), "code-recall-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  let [worker] = context.serviceWorkers();
  worker ??= await context.waitForEvent("serviceworker");
  return { context, extensionId: new URL(worker.url()).host };
}

test("onboards and creates a stable five-problem plan", async () => {
  const { context, extensionId } = await launchExtension();
  try {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/index.html`);

    await expect(page.getByText("Practice on purpose.")).toBeVisible();
    await page.getByRole("button", { name: "Create today’s plan" }).click();

    await expect(page.getByText("Today’s practice")).toBeVisible();
    await expect(page.getByText("Contains Duplicate")).toBeVisible();
    await expect(page.getByText("Valid Anagram")).toBeVisible();
    await expect(page.locator(".queue-item")).toHaveCount(5);

    const completion = await page.evaluate(async () => {
      return chrome.runtime.sendMessage({
        type: "RECORD_COMPLETION",
        problem: {
          id: "duplicate-integer",
          title: "Contains Duplicate",
          url: "https://neetcode.io/problems/duplicate-integer/question?list=neetcode150",
          category: "Arrays & Hashing",
          difficulty: "Easy",
          roadmapOrder: 0,
        },
        source: "manual",
        detectedAt: Date.now(),
      });
    });
    expect(completion.pending.id).toBeTruthy();

    await page.reload();
    const pendingCard = page.locator(".pending-card");
    await expect(pendingCard.getByText("Contains Duplicate")).toBeVisible();
    await pendingCard.getByRole("button", { name: "Solved" }).click();
    await expect(page.getByText("Rate recent work")).toBeHidden();
    await expect(
      page.locator(".queue-item").first().getByText("Done"),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
