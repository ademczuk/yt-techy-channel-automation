import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { runGitHubWalkthrough } from "./lib/github-walkthrough";

async function main() {
  const wsFile = path.join(process.cwd(), "runtime", "browser-session", "two-repo-ws-endpoint.txt");
  if (!fs.existsSync(wsFile)) {
    throw new Error(`Missing browser WebSocket file: ${wsFile}`);
  }

  const endpoint = fs.readFileSync(wsFile, "utf8").trim();
  if (!endpoint) {
    throw new Error(`Browser WebSocket file was empty: ${wsFile}`);
  }

  const browser = await chromium.connectOverCDP(endpoint);
  const contexts = browser.contexts();
  const context = contexts[0];

  if (!context) {
    throw new Error("No existing prepared browser context found.");
  }

  const pages = context.pages();
  if (pages.length < 2) {
    throw new Error("Expected at least two prepared repo tabs before attach.");
  }

  const targets = [
    { page: pages[0], repoUrl: "https://github.com/bytedance/deer-flow" },
    { page: pages[1], repoUrl: "https://github.com/NousResearch/hermes-agent" },
  ];

  for (const target of targets) {
    await target.page.bringToFront();
    await runGitHubWalkthrough(target.page, {
      repoUrl: target.repoUrl,
      durationMs: 15_000,
    });
    await target.page.waitForTimeout(700);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
