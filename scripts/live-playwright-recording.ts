import { chromium, type Page } from "playwright";
import { buildLiveRepoSteps } from "../src/lib/live-playwright-walkthrough";

const DEFAULT_REPOS = [
  "https://github.com/bytedance/deer-flow",
  "https://github.com/NousResearch/hermes-agent",
  "https://github.com/browser-use/browser-use",
];

function getArgValue(name: string): string | undefined {
  const match = process.argv.find((entry) => entry.startsWith(`${name}=`));
  return match?.split("=").slice(1).join("=");
}

function getDelayMs(name: string, fallback: number): number {
  const value = getArgValue(name);
  const parsed = value ? Number.parseInt(value, 10) : fallback;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

async function moveMouseToSelector(page: Page, selector: string): Promise<boolean> {
  const locator = page.locator(selector).first();
  if ((await locator.count().catch(() => 0)) === 0) {
    return false;
  }

  const box = await locator.boundingBox();
  if (!box) {
    return false;
  }

  const x = Math.round(box.x + Math.min(Math.max(box.width * 0.35, 20), Math.max(box.width - 12, 20)));
  const y = Math.round(box.y + Math.min(Math.max(box.height * 0.5, 18), Math.max(box.height - 10, 18)));
  await page.mouse.move(x, y, { steps: 32 });
  await page.waitForTimeout(500);
  return true;
}

async function runRepoPass(page: Page, repoUrl: string, expectedTitleFragment: string, hoverSelectors: string[], scrollSequence: number[]): Promise<void> {
  await page.goto(repoUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(1200);
  await page.waitForFunction(
    (fragment) => document.title.toLowerCase().includes(String(fragment).toLowerCase()),
    expectedTitleFragment,
    { timeout: 10_000 },
  );

  for (const selector of hoverSelectors) {
    await page.locator(selector).first().scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(350);
    await moveMouseToSelector(page, selector);
  }

  for (const delta of scrollSequence) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(delta > 0 ? 900 : 700);
  }
}

async function main() {
  const repoUrls = DEFAULT_REPOS;
  const preflightMs = getDelayMs("--preflight-ms", 0);
  const startDelayMs = getDelayMs("--start-delay-ms", 4_000);
  const betweenTabsMs = getDelayMs("--between-tabs-ms", 1_200);
  const steps = buildLiveRepoSteps(repoUrls);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 40,
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({
    viewport: null,
  });

  const primary = await context.newPage();
  await primary?.bringToFront();
  await primary?.waitForTimeout(preflightMs);

  console.log("Playwright browser ready.");
  console.log("Repo order:");
  steps.forEach((step, index) => console.log(`${index + 1}. ${step.repoUrl}`));
  console.log(`Waiting ${startDelayMs}ms before walkthrough.`);
  await primary?.waitForTimeout(startDelayMs);

  for (const step of steps) {
    await runRepoPass(primary, step.repoUrl, step.expectedTitleFragment, step.hoverSelectors, step.scrollSequence);
    await primary.waitForTimeout(betweenTabsMs);
  }

  console.log("Playwright walkthrough complete.");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
