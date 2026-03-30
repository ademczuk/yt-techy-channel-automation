import fs from "fs";
import path from "path";
import type { Page } from "playwright";
import {
  installWindowsCursorOverlay,
  type GitHubWalkthroughCue,
} from "./github-walkthrough";

export interface ClawHubWalkthroughOptions {
  skillUrl: string;
  durationMs?: number;
  cueOutputPath?: string;
}

interface WalkthroughTarget {
  label: string;
  selectors: string[];
  note: string;
  dwellMs: number;
  action?: "hover" | "click";
}

/**
 * ClawHub skill page targets — adapted from the GitHub walkthrough pattern.
 * These selectors target clawhub.ai/skills/<slug> page elements.
 *
 * NOTE: ClawHub's markup may evolve. If selectors stop resolving, check
 * the live page structure and update this list.
 */
const TARGETS: WalkthroughTarget[] = [
  {
    label: "skill-title",
    selectors: [
      "h1",
      '[data-testid="skill-name"]',
      ".skill-title",
      ".skill-header h1",
      "main h1",
    ],
    note: "Skill name and branding.",
    dwellMs: 2600,
    action: "hover",
  },
  {
    label: "skill-author",
    selectors: [
      '[data-testid="skill-author"]',
      ".skill-author",
      ".author-link",
      'a[href*="/users/"]',
      'a[href*="/publishers/"]',
      ".skill-meta .author",
    ],
    note: "Who built this skill.",
    dwellMs: 2000,
    action: "hover",
  },
  {
    label: "skill-description",
    selectors: [
      ".skill-description",
      ".skill-summary",
      '[data-testid="skill-description"]',
      "main p:first-of-type",
      ".prose > p:first-child",
    ],
    note: "What the skill does.",
    dwellMs: 3200,
    action: "hover",
  },
  {
    label: "install-command",
    selectors: [
      "code",
      "pre",
      '[data-testid="install-command"]',
      ".install-snippet",
      ".copy-command",
    ],
    note: "One-line install — the money shot for developer tools.",
    dwellMs: 3000,
    action: "click",
  },
  {
    label: "stats-downloads",
    selectors: [
      '[data-testid="download-count"]',
      ".download-count",
      ".stats .downloads",
      ".skill-stats",
      ".metric-downloads",
    ],
    note: "Download/install count — traction proof.",
    dwellMs: 2200,
    action: "hover",
  },
  {
    label: "stats-stars",
    selectors: [
      '[data-testid="star-count"]',
      ".star-count",
      ".stats .stars",
      ".metric-stars",
      'button[aria-label*="star"]',
    ],
    note: "Star count — community approval signal.",
    dwellMs: 2000,
    action: "hover",
  },
  {
    label: "skill-readme",
    selectors: [
      ".skill-readme",
      ".skill-content",
      '[data-skill-readme]',
      ".prose",
      "article",
      "main .markdown-body",
    ],
    note: "Skill README/docs — the deep dive.",
    dwellMs: 3800,
    action: "click",
  },
  {
    label: "skill-version",
    selectors: [
      ".version-badge",
      '[data-testid="skill-version"]',
      ".skill-version",
      ".version",
    ],
    note: "Current version — shows active maintenance.",
    dwellMs: 1800,
    action: "hover",
  },
  {
    label: "github-link",
    selectors: [
      'a[href*="github.com"]',
      ".source-link",
      '[data-testid="source-link"]',
      ".repo-link",
    ],
    note: "Link to source repo — shows it's open and inspectable.",
    dwellMs: 2400,
    action: "hover",
  },
];

/**
 * Run a walkthrough of a ClawHub skill page.
 *
 * Same movement/interaction patterns as the GitHub walkthrough but
 * targeting ClawHub-specific page elements.
 */
export async function runClawHubWalkthrough(
  page: Page,
  options: ClawHubWalkthroughOptions,
): Promise<GitHubWalkthroughCue[]> {
  const durationMs = options.durationMs ?? 45_000;
  const start = Date.now();
  const cues: GitHubWalkthroughCue[] = [];

  // Navigate to skill page
  await page.goto(options.skillUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(1800);

  await installWindowsCursorOverlay(page);

  const resolvedTargets = await resolveTargets(page);
  if (resolvedTargets.length === 0) {
    throw new Error(
      `Could not resolve walkthrough targets for ${options.skillUrl}`,
    );
  }

  let cursor = {
    x: Math.round((page.viewportSize()?.width ?? 1920) * 0.22),
    y: Math.round((page.viewportSize()?.height ?? 1080) * 0.18),
  };
  await page.mouse.move(cursor.x, cursor.y);
  await page.waitForTimeout(700);

  while (Date.now() - start < durationMs - 2500) {
    for (const target of resolvedTargets) {
      if (Date.now() - start >= durationMs - 2500) break;

      const activeLocator = page.locator(target.selector).first();
      const box = await activeLocator.boundingBox().catch(() => null);
      if (!box) continue;

      await scrollIntoViewNaturally(page, box.y);
      await page.waitForTimeout(350);

      const refreshed = await activeLocator.boundingBox().catch(() => null);
      if (!refreshed) continue;

      const aim = {
        x: Math.round(
          refreshed.x +
            Math.min(
              refreshed.width * 0.35,
              Math.max(18, refreshed.width - 20),
            ),
        ),
        y: Math.round(
          refreshed.y +
            Math.min(
              refreshed.height * 0.45,
              Math.max(16, refreshed.height - 16),
            ),
        ),
      };

      await moveMouseNaturally(page, cursor, aim, 950);
      cursor = aim;
      await page.waitForTimeout(250);

      cues.push({
        label: target.label,
        selector: target.selector,
        timestampMs: Date.now() - start,
        normalizedX: clamp01(aim.x / (page.viewportSize()?.width ?? 1920)),
        normalizedY: clamp01(aim.y / (page.viewportSize()?.height ?? 1080)),
        note: target.note,
      });

      await lingerWithMicroMovement(page, cursor, target.dwellMs);

      if (target.action === "click") {
        await page.mouse.down();
        await page.waitForTimeout(Math.random() * 50 + 40);
        await page.mouse.up();
        await page.waitForTimeout(800);
      }

      await nudgeScroll(page);
    }
  }

  if (options.cueOutputPath) {
    fs.mkdirSync(path.dirname(options.cueOutputPath), { recursive: true });
    fs.writeFileSync(
      options.cueOutputPath,
      JSON.stringify(cues, null, 2),
      "utf8",
    );
  }

  return cues;
}

// ── Helpers (same patterns as github-walkthrough.ts) ─────────────

async function resolveTargets(
  page: Page,
): Promise<
  Array<{
    label: string;
    selector: string;
    note: string;
    dwellMs: number;
    action?: "hover" | "click";
  }>
> {
  const resolved = [];
  for (const target of TARGETS) {
    for (const selector of target.selectors) {
      const locator = page.locator(selector).first();
      if (await locator.count().catch(() => 0)) {
        resolved.push({
          label: target.label,
          selector,
          note: target.note,
          dwellMs: target.dwellMs,
          action: target.action,
        });
        break;
      }
    }
  }
  return resolved;
}

async function scrollIntoViewNaturally(
  page: Page,
  targetTop: number,
): Promise<void> {
  const viewportHeight = page.viewportSize()?.height ?? 1080;
  const desiredY = Math.max(0, targetTop - viewportHeight * 0.28);
  const currentY = await page.evaluate(() => window.scrollY);
  const distance = desiredY - currentY;
  const steps = Math.max(10, Math.min(28, Math.round(Math.abs(distance) / 120)));

  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const eased = 1 - Math.pow(1 - progress, 3);
    const nextY = currentY + distance * eased;
    await page.evaluate(
      (value) => window.scrollTo({ top: value, behavior: "instant" }),
      nextY,
    );
    await page.waitForTimeout(120 + Math.round((i % 3) * 35));
  }
}

async function moveMouseNaturally(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  durationMs: number,
): Promise<void> {
  const steps = Math.max(22, Math.min(52, Math.round(durationMs / 34)));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const swayX = Math.sin(t * Math.PI) * 6;
    const swayY = Math.sin(t * Math.PI * 0.7) * 3;
    const x = Math.round(from.x + (to.x - from.x) * eased + swayX);
    const y = Math.round(from.y + (to.y - from.y) * eased + swayY);
    await page.mouse.move(x, y);
    await page
      .evaluate(
        ([cursorX, cursorY]) => {
          const move = (
            window as unknown as {
              __codexDemoMoveCursor?: (x: number, y: number) => void;
            }
          ).__codexDemoMoveCursor;
          move?.(cursorX, cursorY);
        },
        [x, y],
      )
      .catch(() => undefined);
    await page.waitForTimeout(Math.max(18, Math.round(durationMs / steps)));
  }
}

async function lingerWithMicroMovement(
  page: Page,
  point: { x: number; y: number },
  dwellMs: number,
): Promise<void> {
  const beats = Math.max(3, Math.round(dwellMs / 700));
  for (let i = 0; i < beats; i++) {
    const nextX = point.x + (i % 2 === 0 ? 4 : -3);
    const nextY = point.y + (i % 3 === 0 ? 3 : -2);
    await page.mouse.move(nextX, nextY, { steps: 6 });
    await page
      .evaluate(
        ([cursorX, cursorY]) => {
          const move = (
            window as unknown as {
              __codexDemoMoveCursor?: (x: number, y: number) => void;
            }
          ).__codexDemoMoveCursor;
          move?.(cursorX, cursorY);
        },
        [nextX, nextY],
      )
      .catch(() => undefined);
    await page.waitForTimeout(Math.round(dwellMs / beats) - 80);
    await page.mouse.move(point.x, point.y, { steps: 5 });
    await page
      .evaluate(
        ([cursorX, cursorY]) => {
          const move = (
            window as unknown as {
              __codexDemoMoveCursor?: (x: number, y: number) => void;
            }
          ).__codexDemoMoveCursor;
          move?.(cursorX, cursorY);
        },
        [point.x, point.y],
      )
      .catch(() => undefined);
    await page.waitForTimeout(80);
  }
}

async function nudgeScroll(page: Page): Promise<void> {
  await page.evaluate(() =>
    window.scrollBy({ top: 28, behavior: "instant" }),
  );
  await page.waitForTimeout(180);
  await page.evaluate(() =>
    window.scrollBy({ top: -12, behavior: "instant" }),
  );
  await page.waitForTimeout(220);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
