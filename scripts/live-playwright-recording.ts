import { chromium, type Page } from "playwright";
import { mouse, Point, straightTo, Button } from "@nut-tree-fork/nut-js";
import { buildLiveRepoSteps } from "../src/lib/live-playwright-walkthrough";
import {
  buildFullscreenBrowserLaunchArgs,
  isRedundantSelfClick,
  resolveSafeBrowserScreenPoint,
  smoothScrollPage,
} from "../src/lib/live-playwright-demo";

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

function getCountArg(name: string, fallback: number): number {
  const value = getArgValue(name);
  const parsed = value ? Number.parseInt(value, 10) : fallback;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
  
  // Also get window position relative to screen so we can move the OS mouse
  const windowPos = await page.evaluate(() => {
    return {
      screenX: window.screenX,
      screenY: window.screenY,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };
  });

  // Move both Playwright's virtual mouse (for hover states)
  await page.mouse.move(x, y, { steps: 32 });

  const safePoint = resolveSafeBrowserScreenPoint(windowPos, { x, y });
  if (!safePoint) {
    return false;
  }

  // Move the REAL OS mouse (for Cursorful/Recordly capture)
  await mouse.move(straightTo(new Point(safePoint.screenX, safePoint.screenY)));
  
  await page.waitForTimeout(180);
  return true;
}

async function runRepoPass(page: Page, repoUrl: string, expectedTitleFragment: string, hoverSelectors: string[], scrollSequence: number[]): Promise<void> {
  await page.goto(repoUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(450);
  await page.waitForFunction(
    (fragment) => document.title.toLowerCase().includes(String(fragment).toLowerCase()),
    expectedTitleFragment,
    { timeout: 10_000 },
  );

  for (const selector of hoverSelectors) {
    const didMove = await moveMouseToSelector(page, selector);
    if (didMove && await shouldClickSelector(page, selector, repoUrl)) {
      await mouse.click(Button.LEFT);
      await page.waitForTimeout(550);
    }
  }

  for (const delta of scrollSequence) {
    await smoothScrollPage(page, delta, 900);
  }
}

async function shouldClickSelector(page: Page, selector: string, repoUrl: string): Promise<boolean> {
  if (!(selector.includes("a") || selector.includes("button"))) {
    return false;
  }

  const locator = page.locator(selector).first();
  const href = await locator.getAttribute("href").catch(() => null);
  const currentUrl = await safePageUrl(page, repoUrl);
  return !isRedundantSelfClick(currentUrl, href);
}

async function safePageUrl(page: Page, fallback: string): Promise<string> {
  try {
    return page.url();
  } catch {
    return fallback;
  }
}

async function main() {
  mouse.config.mouseSpeed = 600; // pixels per second
  const repoLimit = getCountArg("--repo-limit", DEFAULT_REPOS.length);
  const repoUrls = DEFAULT_REPOS.slice(0, repoLimit);
  const preflightMs = getDelayMs("--preflight-ms", 0);
  const startDelayMs = getDelayMs("--start-delay-ms", 1_200);
  const betweenTabsMs = getDelayMs("--between-tabs-ms", 250);
  const steps = buildLiveRepoSteps(repoUrls);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 0,
    args: buildFullscreenBrowserLaunchArgs({ width: 1920, height: 1080 }),
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
