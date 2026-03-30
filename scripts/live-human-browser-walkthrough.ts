import { chromium } from "playwright";
import { runGitHubWalkthrough } from "./lib/github-walkthrough";
import { runClawHubWalkthrough } from "./lib/clawhub-walkthrough";
import { buildHumanBrowserPlan } from "../src/lib/human-browser-skill";

const DEFAULT_REPOS = [
  "https://clawhub.ai/skills/self-improving-agent",
  "https://clawhub.ai/skills/find-skills",
  "https://clawhub.ai/skills/polymarketodds",
];

function isClawHubUrl(url: string): boolean {
  return url.includes("clawhub.ai/skills/");
}

function getArgValue(name: string): string | undefined {
  const match = process.argv.find((entry) => entry.startsWith(`${name}=`));
  return match?.split("=").slice(1).join("=");
}

function getIntArg(name: string, fallback: number): number {
  const value = getArgValue(name);
  const parsed = value ? Number.parseInt(value, 10) : fallback;
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const startDelayMs = Math.max(0, getIntArg("--start-delay-ms", 0));
  const perRepoSeconds = getIntArg("--per-repo-seconds", 12);
  const betweenReposMs = getIntArg("--between-repos-ms", 1200);
  const plan = buildHumanBrowserPlan(DEFAULT_REPOS, perRepoSeconds, betweenReposMs);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 35,
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  console.log("Human browser walkthrough ready.");
  plan.repoUrls.forEach((repoUrl, index) => console.log(`${index + 1}. ${repoUrl}`));
  console.log(`Waiting ${startDelayMs}ms before walkthrough.`);
  await page.waitForTimeout(startDelayMs);

  for (const repoUrl of plan.repoUrls) {
    if (isClawHubUrl(repoUrl)) {
      await runClawHubWalkthrough(page, {
        skillUrl: repoUrl,
        durationMs: plan.perRepoDurationMs,
      });
    } else {
      await runGitHubWalkthrough(page, {
        repoUrl,
        durationMs: plan.perRepoDurationMs,
      });
    }
    await page.waitForTimeout(plan.betweenReposMs);
  }

  console.log("Human browser walkthrough complete.");
  await context.close();
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

