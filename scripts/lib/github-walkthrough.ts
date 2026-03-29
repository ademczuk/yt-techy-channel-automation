import fs from "fs";
import path from "path";
import type { Browser, Page } from "playwright";

export interface GitHubWalkthroughCue {
  label: string;
  selector: string;
  timestampMs: number;
  normalizedX: number;
  normalizedY: number;
  note?: string;
}

export interface GitHubWalkthroughOptions {
  repoUrl: string;
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

  const TARGETS: WalkthroughTarget[] = [
  {
    label: "repo-title",
    selectors: ['[itemprop="name"] a', 'strong[itemprop="name"] a'],
    note: "Repo name and owner.",
    dwellMs: 2600,
    action: "hover",
  },
  {
    label: "repo-description",
    selectors: ['[data-testid="repository-description"]', 'p.f4.my-3'],
    note: "What the project does.",
    dwellMs: 3000,
    action: "hover",
  },
  {
    label: "star-button",
    selectors: ['#repo-stars-counter-star', 'a[href$="/stargazers"]', 'button[aria-label*="star"]'],
    note: "Traction and social proof.",
    dwellMs: 2200,
    action: "hover",
  },
  {
    label: "about-sidebar",
    selectors: ['[aria-label="About"]', 'div.Layout-sidebar'],
    note: "Links, releases, and extra metadata.",
    dwellMs: 2400,
    action: "hover",
  },
  {
    label: "readme-start",
    selectors: ['#readme h1', 'article.markdown-body h1', '#readme h2', 'article.markdown-body h2'],
    note: "README opening section.",
    dwellMs: 3400,
    action: "click",
  },
  {
    label: "readme-link",
    selectors: ['article.markdown-body a[href^="http"]', 'article.markdown-body a'],
    note: "Click a real link inside the README to show exploration.",
    dwellMs: 4000,
    action: "click",
  },
  {
    label: "code-sample",
    selectors: ['article.markdown-body pre', 'article.markdown-body code', '#readme pre'],
    note: "Code or command example.",
    dwellMs: 3000,
    action: "click",
  },
];

export function buildTestOutputDir(rootDir: string, method: string, now: Date = new Date()): string {
  const stamp = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const outputDir = path.join(rootDir, "runtime", "tests", stamp, method);
  fs.mkdirSync(outputDir, { recursive: true });
  return outputDir;
}

export async function prepareGitHubRepo(page: Page, repoUrl: string): Promise<void> {
  await page.goto(repoUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(1800);
}

export async function runGitHubWalkthrough(
  page: Page,
  options: GitHubWalkthroughOptions,
): Promise<GitHubWalkthroughCue[]> {
  const durationMs = options.durationMs ?? 60_000;
  const start = Date.now();
  const cues: GitHubWalkthroughCue[] = [];

  await prepareGitHubRepo(page, options.repoUrl);
  await installWindowsCursorOverlay(page);

  const resolvedTargets = await resolveTargets(page);
  if (resolvedTargets.length === 0) {
    throw new Error(`Could not resolve walkthrough targets for ${options.repoUrl}`);
  }

  let cursor = {
    x: Math.round((page.viewportSize()?.width ?? 1920) * 0.22),
    y: Math.round((page.viewportSize()?.height ?? 1080) * 0.18),
  };
  await page.mouse.move(cursor.x, cursor.y);
  await page.waitForTimeout(700);

  while (Date.now() - start < durationMs - 2500) {
    for (const target of resolvedTargets) {
      if (Date.now() - start >= durationMs - 2500) {
        break;
      }

      // Since we might have navigated, refresh the locator dynamically
      const activeLocator = page.locator(target.selector).first();
      const box = await activeLocator.boundingBox().catch(() => null);
      if (!box) {
        continue;
      }

      await scrollIntoViewNaturally(page, box.y);
      await page.waitForTimeout(350);

      const refreshed = await activeLocator.boundingBox().catch(() => null);
      if (!refreshed) {
        continue;
      }

      const aim = {
        x: Math.round(refreshed.x + Math.min(refreshed.width * 0.35, Math.max(18, refreshed.width - 20))),
        y: Math.round(refreshed.y + Math.min(refreshed.height * 0.45, Math.max(16, refreshed.height - 16))),
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
        await page.waitForTimeout(1000); // let page react
        
        // Wait for potential navigation or media playback
        try {
          await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
        } catch {}

        // If URL changed significantly, hang out then go back
        const newUrl = page.url();
        if (newUrl !== options.repoUrl && !newUrl.includes("#")) {
          // It navigated! Let's scroll around the new page to prove it's a real click.
          await nudgeScroll(page);
          await page.waitForTimeout(2000);
          await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
          await page.waitForTimeout(1500);
          
          // Must reinstall the SVG cursor because the page reloaded!
          await installWindowsCursorOverlay(page);
          // And we might need to recreate the mouse position state here
        }
      }

      await nudgeScroll(page);
    }
  }

  if (options.cueOutputPath) {
    fs.mkdirSync(path.dirname(options.cueOutputPath), { recursive: true });
    fs.writeFileSync(options.cueOutputPath, JSON.stringify(cues, null, 2), "utf8");
  }

  return cues;
}

export async function installWindowsCursorOverlay(page: Page): Promise<void> {
  const cursorSvg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <path d="M7 4L7 28L13.4 22.8L17.7 35L21.8 33.4L17.7 21.4L28 21.2L7 4Z" fill="white" stroke="#111827" stroke-width="2.2" stroke-linejoin="round"/>
    </svg>
  `);

  await page.addStyleTag({
    content: `
      * { cursor: none !important; }
      .codex-demo-cursor {
        position: fixed;
        width: 40px;
        height: 40px;
        pointer-events: none;
        z-index: 2147483647;
        transform: translate(-3px, -3px);
        background: url("data:image/svg+xml,${cursorSvg}") no-repeat center / contain;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.45));
      }
      .codex-demo-halo {
        position: fixed;
        width: 54px;
        height: 54px;
        border-radius: 999px;
        background: rgba(250, 204, 21, 0.22);
        border: 2px solid rgba(250, 204, 21, 0.58);
        pointer-events: none;
        z-index: 2147483645;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.12);
      }
      .codex-demo-ripple {
        position: fixed;
        width: 56px;
        height: 56px;
        border-radius: 999px;
        border: 2px solid rgba(250, 204, 21, 0.8);
        pointer-events: none;
        z-index: 2147483646;
        transform: translate(-50%, -50%) scale(0.5);
        opacity: 0;
      }
    `,
  });

  await page.evaluate(`
    (() => {
      if (document.querySelector('.codex-demo-cursor')) {
        return;
      }

      const cursor = document.createElement('div');
      cursor.className = 'codex-demo-cursor';
      document.body.appendChild(cursor);

      const halo = document.createElement('div');
      halo.className = 'codex-demo-halo';
      document.body.appendChild(halo);

      const ripple = document.createElement('div');
      ripple.className = 'codex-demo-ripple';
      document.body.appendChild(ripple);

      const move = (x, y) => {
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
        halo.style.left = x + 'px';
        halo.style.top = y + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
      };

      window.__codexDemoMoveCursor = move;
      window.__codexDemoClickCursor = () => {
        ripple.animate(
          [
            { transform: 'translate(-50%, -50%) scale(0.4)', opacity: '0.55' },
            { transform: 'translate(-50%, -50%) scale(1.8)', opacity: '0' }
          ],
          { duration: 360, easing: 'ease-out' }
        );
      };

      document.addEventListener('mousemove', (event) => move(event.clientX, event.clientY));
      document.addEventListener('mousedown', () => window.__codexDemoClickCursor?.());
      move(180, 120);
    })();
  `);
}

export async function launchVisibleChromium(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: undefined,
  });
  const page = await context.newPage();
  return page;
}

async function resolveTargets(page: Page): Promise<Array<{ label: string; selector: string; locator: ReturnType<Page["locator"]>; note: string; dwellMs: number; action?: "hover" | "click" }>> {
  const resolved = [];

  for (const target of TARGETS) {
    for (const selector of target.selectors) {
      const locator = page.locator(selector).first();
      if (await locator.count().catch(() => 0)) {
        resolved.push({
          label: target.label,
          selector,
          locator,
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

async function scrollIntoViewNaturally(page: Page, targetTop: number): Promise<void> {
  const viewportHeight = page.viewportSize()?.height ?? 1080;
  const desiredY = Math.max(0, targetTop - viewportHeight * 0.28);
  const currentY = await page.evaluate(() => window.scrollY);
  const distance = desiredY - currentY;
  const steps = Math.max(10, Math.min(28, Math.round(Math.abs(distance) / 120)));

  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const eased = 1 - Math.pow(1 - progress, 3);
    const nextY = currentY + distance * eased;
    await page.evaluate((value) => window.scrollTo({ top: value, behavior: "instant" }), nextY);
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
    await page.evaluate(
      ([cursorX, cursorY]) => {
        const move = (window as unknown as { __codexDemoMoveCursor?: (x: number, y: number) => void }).__codexDemoMoveCursor;
        move?.(cursorX, cursorY);
      },
      [x, y],
    ).catch(() => undefined);
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
    await page.evaluate(
      ([cursorX, cursorY]) => {
        const move = (window as unknown as { __codexDemoMoveCursor?: (x: number, y: number) => void }).__codexDemoMoveCursor;
        move?.(cursorX, cursorY);
      },
      [nextX, nextY],
    ).catch(() => undefined);
    await page.waitForTimeout(Math.round(dwellMs / beats) - 80);
    await page.mouse.move(point.x, point.y, { steps: 5 });
    await page.evaluate(
      ([cursorX, cursorY]) => {
        const move = (window as unknown as { __codexDemoMoveCursor?: (x: number, y: number) => void }).__codexDemoMoveCursor;
        move?.(cursorX, cursorY);
      },
      [point.x, point.y],
    ).catch(() => undefined);
    await page.waitForTimeout(80);
  }
}

async function nudgeScroll(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollBy({ top: 28, behavior: "instant" }));
  await page.waitForTimeout(180);
  await page.evaluate(() => window.scrollBy({ top: -12, behavior: "instant" }));
  await page.waitForTimeout(220);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
