import fs from "fs";
import path from "path";
import { execFileSync, spawn } from "node:child_process";
import { chromium, type BrowserContext, type Locator, type Page } from "playwright";
import { mouse, Point, straightTo, Button } from "@nut-tree-fork/nut-js";
import {
  buildLiveExecutionPlan,
  buildTabStripChromePoint,
  titleFragmentFromRepoUrl,
} from "../src/lib/live-playwright-walkthrough";
import { buildTestOutputDir } from "./lib/github-walkthrough";
import { runLiveLocalScreenDemoPipeline } from "../src/lib/live-local-screen-demo";
import {
  buildFullscreenBrowserLaunchArgs,
  buildWindowCaptureArgs,
  isBoxMostlyVisibleInViewport,
  isRedundantSelfClick,
  isRepoScopedLink,
  probeVideoDurationMs,
  resolveSafeBrowserChromePoint,
  resolveSafeBrowserScreenPoint,
  smoothScrollPage,
  type BrowserWindowMetrics,
} from "../src/lib/live-playwright-demo";
import type { DemoMoment } from "../src/lib/screen-demo-types";
import type { HarnessRecordingPlan, RecordingBeatPlan } from "../src/lib/harness-recording-plan";

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

function getRepoUrls(): string[] {
  const values = process.argv
    .filter((entry) => entry.startsWith("--repo-url="))
    .map((entry) => entry.split("=").slice(1).join("="))
    .map((entry) => entry.trim())
    .filter(Boolean);

  return values.length > 0 ? values : DEFAULT_REPOS;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function getAudioManifestPath(): string | undefined {
  return getArgValue("--audio-manifest-path");
}

function getRecordingPlanPath(): string | undefined {
  return getArgValue("--recording-plan-path");
}

function buildFallbackRecordingPlan(repoUrls: string[]): HarnessRecordingPlan {
  return {
    generatedAt: new Date().toISOString(),
    repoUrls,
    capturePrompt: `Create a polished product demo for ${repoUrls.join(" and ")} with real mouse movement and trimmed dead time.`,
    viewport: { width: 1920, height: 1080 },
    audioDurationMs: 0,
    introLeadInMs: 0,
    tabs: repoUrls.map((repoUrl, index) => ({
      repoUrl,
      slug: new URL(repoUrl).pathname.replace(/^\/+/, ""),
      titleFragment: titleFragmentFromRepoUrl(repoUrl),
      tabIndex: index,
    })),
    repos: repoUrls.map((repoUrl, index) => ({
      repoUrl,
      slug: new URL(repoUrl).pathname.replace(/^\/+/, ""),
      name: titleFragmentFromRepoUrl(repoUrl),
      tabIndex: index,
      narration: `${titleFragmentFromRepoUrl(repoUrl)} walkthrough.`,
      segmentDurationMs: 5200,
      visualProof: [],
      beats: [
        {
          id: `focus-${index}`,
          label: "Orient on the repo header",
          action: "hover-text-region",
          durationMs: 1200,
          allowedZone: "page",
          selectorCandidates: ["[itemprop='name'] a", "main h1", "a[href='#readme-ov-file']"],
          targetKind: "header",
        },
        {
          id: `follow-${index}`,
          label: "Hover over the visible repo overview",
          action: "hover-text-region",
          durationMs: 1500,
          allowedZone: "page",
          selectorCandidates: ["div.BorderGrid-cell p", "a[href='#readme-ov-file']", "main h2"],
          targetKind: "description",
        },
        {
          id: `scroll-${index}`,
          label: "Smooth scroll into the README",
          action: "smooth-scroll",
          durationMs: 1800,
          allowedZone: "page",
          selectorCandidates: ["main", "article.markdown-body"],
          targetKind: "readme",
          deltaY: 1040,
        },
        {
          id: `readme-${index}`,
          label: "Focus README heading",
          action: "focus-heading",
          durationMs: 1200,
          allowedZone: "page",
          selectorCandidates: ["article.markdown-body h1", "article.markdown-body h2"],
          targetKind: "header",
        },
        {
          id: `link-${index}`,
          label: "Open a supporting README link",
          action: "click-link",
          durationMs: 1100,
          allowedZone: "page",
          selectorCandidates: ["#readme article a[href]:not([href^='#'])", "article.markdown-body a[href]:not([href^='#'])"],
          targetKind: "link",
        },
      ],
    })),
  };
}

function loadRecordingPlan(repoUrls: string[]): HarnessRecordingPlan {
  const recordingPlanPath = getRecordingPlanPath();
  if (!recordingPlanPath || !fs.existsSync(recordingPlanPath)) {
    return buildFallbackRecordingPlan(repoUrls);
  }

  return JSON.parse(fs.readFileSync(recordingPlanPath, "utf8")) as HarnessRecordingPlan;
}

async function readBrowserWindowMetrics(page: Page): Promise<BrowserWindowMetrics> {
  return page.evaluate(() => ({
    screenX: window.screenX,
    screenY: window.screenY,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  }));
}

async function moveToViewportPoint(
  page: Page,
  viewportPoint: { x: number; y: number },
  metrics?: BrowserWindowMetrics,
): Promise<boolean> {
  const resolvedMetrics = metrics ?? await readBrowserWindowMetrics(page);
  const safePoint = resolveSafeBrowserScreenPoint(resolvedMetrics, viewportPoint);
  if (!safePoint) {
    return false;
  }

  await page.mouse.move(viewportPoint.x, viewportPoint.y, { steps: 24 });
  await mouse.move(straightTo(new Point(safePoint.screenX, safePoint.screenY)));
  return true;
}

async function moveAlongViewportPath(
  page: Page,
  points: Array<{ x: number; y: number }>,
  input: { durationMs: number; waitBetweenMs?: number; metrics?: BrowserWindowMetrics },
): Promise<boolean> {
  if (points.length === 0) {
    return false;
  }

  const resolvedMetrics = input.metrics ?? await readBrowserWindowMetrics(page);
  const waitBetweenMs = input.waitBetweenMs ?? Math.max(45, Math.round(input.durationMs / Math.max(points.length, 1)));
  for (const point of points) {
    const moved = await moveToViewportPoint(page, point, resolvedMetrics);
    if (!moved) {
      return false;
    }
    await page.waitForTimeout(waitBetweenMs);
  }
  return true;
}

async function locateBeatTarget(page: Page, beat: RecordingBeatPlan): Promise<{
  locator: Locator;
  selector: string;
  box: { x: number; y: number; width: number; height: number };
} | null> {
  const selectors = beat.selectorCandidates ?? [];
  const metrics = await readBrowserWindowMetrics(page);
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count().catch(() => 0)) === 0) {
      continue;
    }
    const box = await locator.boundingBox();
    if (!box || !isBoxMostlyVisibleInViewport(box, { width: metrics.innerWidth, height: metrics.innerHeight })) {
      continue;
    }
    return { locator, selector, box };
  }
  return null;
}

async function locateClickableTarget(page: Page, beat: RecordingBeatPlan): Promise<{
  locator: Locator;
  selector: string;
  href: string | null;
  box: { x: number; y: number; width: number; height: number };
} | null> {
  const currentUrl = await safePageUrl(page, "");
  const metrics = await readBrowserWindowMetrics(page);
  for (const selector of beat.selectorCandidates ?? []) {
    const locator = page.locator(selector);
    const count = Math.min(await locator.count().catch(() => 0), 6);
    for (let index = 0; index < count; index += 1) {
      const candidate = locator.nth(index);
      const href = await candidate.getAttribute("href").catch(() => null);
      if (!href || isRedundantSelfClick(currentUrl, href) || !isRepoScopedLink(currentUrl, href)) {
        continue;
      }
      const box = await candidate.boundingBox();
      if (!box || !isBoxMostlyVisibleInViewport(box, { width: metrics.innerWidth, height: metrics.innerHeight })) {
        continue;
      }
      return { locator: candidate, selector, href, box };
    }
  }
  return null;
}

function buildBoxCenter(box: { x: number; y: number; width: number; height: number }) {
  return {
    x: Math.round(box.x + Math.max(18, Math.min(box.width * 0.4, box.width - 12))),
    y: Math.round(box.y + Math.max(18, Math.min(box.height * 0.5, box.height - 10))),
  };
}

function buildReadingLanePath(box: { x: number; y: number; width: number; height: number }) {
  const centerY = Math.round(box.y + Math.max(20, Math.min(box.height * 0.55, box.height - 12)));
  const leftX = Math.round(box.x + Math.max(16, Math.min(box.width * 0.18, box.width - 30)));
  const midX = Math.round(box.x + Math.max(30, Math.min(box.width * 0.48, box.width - 20)));
  const rightX = Math.round(box.x + Math.max(40, Math.min(box.width * 0.78, box.width - 12)));
  return [
    { x: leftX, y: centerY },
    { x: midX, y: centerY + 6 },
    { x: rightX, y: centerY - 4 },
  ];
}

function buildEllipsePath(box: { x: number; y: number; width: number; height: number }) {
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const radiusX = Math.max(18, Math.min(box.width / 2.4, 80));
  const radiusY = Math.max(14, Math.min(box.height / 2.7, 56));
  return Array.from({ length: 8 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 8;
    return {
      x: Math.round(centerX + Math.cos(angle) * radiusX),
      y: Math.round(centerY + Math.sin(angle) * radiusY),
    };
  });
}

async function executeBeat(
  page: Page,
  beat: RecordingBeatPlan,
  repoUrl: string,
  startedAt: number,
  moments: DemoMoment[],
): Promise<void> {
  const metrics = await readBrowserWindowMetrics(page);
  const beatStart = Date.now() - startedAt;

  if (beat.action === "smooth-scroll" || beat.action === "passive-scroll") {
    const target = await locateBeatTarget(page, beat);
    if (target) {
      await moveToViewportPoint(page, buildBoxCenter(target.box), metrics);
    }
    await smoothScrollPage(page, beat.deltaY ?? 420, beat.durationMs);
    moments.push({
      timeMs: beatStart,
      endMs: Date.now() - startedAt,
      action: "scroll",
      label: beat.label,
      url: repoUrl,
    });
    return;
  }

  if (beat.action === "click-link") {
    const clickable = await locateClickableTarget(page, beat);
    if (!clickable) {
      return;
    }
    await moveToViewportPoint(page, buildBoxCenter(clickable.box), metrics);
    await page.waitForTimeout(120);
    await mouse.click(Button.LEFT);
    await page.waitForTimeout(Math.max(450, beat.durationMs));
    moments.push({
      timeMs: beatStart,
      endMs: Date.now() - startedAt,
      action: "click",
      label: beat.label,
      selector: clickable.selector,
      url: repoUrl,
      bounds: clickable.box,
    });
    return;
  }

  const target = await locateBeatTarget(page, beat);
  if (!target) {
    return;
  }

  let pathPoints = [buildBoxCenter(target.box)];
  if (beat.action === "follow-reading-lane") {
    pathPoints = buildReadingLanePath(target.box);
  } else if (beat.action === "circle-region") {
    pathPoints = buildEllipsePath(target.box);
  }

  const moved = await moveAlongViewportPath(page, pathPoints, {
    durationMs: beat.durationMs,
    metrics,
  });
  if (!moved) {
    return;
  }

  moments.push({
    timeMs: beatStart,
    endMs: Date.now() - startedAt,
    action: "hover",
    label: beat.label,
    selector: target.selector,
    url: repoUrl,
    bounds: target.box,
  });
}

async function safePageUrl(page: Page, fallback: string): Promise<string> {
  try {
    return page.url();
  } catch {
    return fallback;
  }
}

async function switchToRepoTab(
  page: Page,
  input: {
    tabIndex: number;
    tabCount: number;
    titleFragment: string;
    startedAt: number;
    moments: DemoMoment[];
  },
): Promise<void> {
  const metrics = await readBrowserWindowMetrics(page);
  const chromePoint = buildTabStripChromePoint(metrics, input.tabIndex, input.tabCount);
  const safeChromePoint = chromePoint ? resolveSafeBrowserChromePoint(metrics, chromePoint) : null;
  const started = Date.now() - input.startedAt;

  if (safeChromePoint) {
    await mouse.move(straightTo(new Point(safeChromePoint.screenX, safeChromePoint.screenY)));
    await page.waitForTimeout(120);
    await mouse.click(Button.LEFT);
    await page.waitForTimeout(180);
  }

  await page.bringToFront();
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForFunction(
    (fragment) => document.title.toLowerCase().includes(String(fragment).toLowerCase()),
    input.titleFragment,
    { timeout: 10_000 },
  ).catch(() => undefined);

  input.moments.push({
    timeMs: started,
    endMs: Date.now() - input.startedAt,
    action: "click",
    label: `switch-tab-${input.tabIndex + 1}`,
    url: await safePageUrl(page, ""),
  });
}

async function executeRepoPlan(
  page: Page,
  repoExecution: ReturnType<typeof buildLiveExecutionPlan>["repoExecutions"][number],
  executionPlan: ReturnType<typeof buildLiveExecutionPlan>,
  startedAt: number,
  moments: DemoMoment[],
  isFirstRepo: boolean,
): Promise<void> {
  if (!isFirstRepo) {
    await switchToRepoTab(page, {
      tabIndex: repoExecution.tabIndex,
      tabCount: executionPlan.tabs.length,
      titleFragment: repoExecution.expectedTitleFragment,
      startedAt,
      moments,
    });
  } else {
    await page.bringToFront();
  }

  for (const beat of repoExecution.beats) {
    await executeBeat(page, beat, repoExecution.repoUrl, startedAt, moments);
  }
}

async function primeRepoTabs(input: {
  context: BrowserContext;
  repoUrls: string[];
}): Promise<Map<number, Page>> {
  const pages = new Map<number, Page>();

  for (const [index, repoUrl] of input.repoUrls.entries()) {
    const page = await input.context.newPage();
    await page.goto(repoUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    pages.set(index, page);
  }

  return pages;
}

async function main() {
  mouse.config.mouseSpeed = 700;
  const rootDir = process.cwd();
  const scratchDir = buildTestOutputDir(rootDir, "live-playwright-demo");
  const rawCapturePath = path.join(scratchDir, "desktop-raw.mp4");
  fs.mkdirSync(scratchDir, { recursive: true });

  const startDelayMs = getDelayMs("--start-delay-ms", 600);
  const betweenTabsMs = getDelayMs("--between-tabs-ms", 150);
  const repoSource = getRepoUrls();
  const repoLimit = getCountArg("--repo-limit", repoSource.length);
  const skipRender = hasFlag("--skip-render");
  const audioManifestPath = getAudioManifestPath();
  const repoUrls = repoSource.slice(0, repoLimit);
  const recordingPlan = loadRecordingPlan(repoUrls);
  const executionPlan = buildLiveExecutionPlan(recordingPlan);
  const audioManifest = audioManifestPath && fs.existsSync(audioManifestPath)
    ? JSON.parse(fs.readFileSync(audioManifestPath, "utf8")) as {
      provider: string;
      generatedAt: string;
      totalDurationMs: number;
      segments: Array<{
        id: string;
        label: string;
        path: string;
        durationMs: number;
      }>;
    }
    : undefined;

  const browser = await chromium.launch({
    headless: false,
    slowMo: 0,
    args: buildFullscreenBrowserLaunchArgs(recordingPlan.viewport),
  });

  const discoveryContext = await browser.newContext({ viewport: null });
  const discoveryPage = await discoveryContext.newPage();
  const discoveryTitle = `Codex Live Capture ${Date.now()}`;
  await discoveryPage.goto(`data:text/html,<title>${encodeURIComponent(discoveryTitle)}</title><body style="background:#111"></body>`);
  await discoveryPage.bringToFront();
  await discoveryPage.waitForTimeout(250);
  const captureWindow = focusBrowserWindowByTitle(discoveryTitle, new Date(Date.now() - 120000));
  const pages = await primeRepoTabs({
    context: discoveryContext,
    repoUrls: recordingPlan.repoUrls,
  });
  const firstPage = pages.get(0);
  if (!firstPage) {
    throw new Error("No repo pages were opened for capture.");
  }
  await discoveryPage.close();
  await firstPage.bringToFront();
  await firstPage.waitForTimeout(250);

  const ffmpeg = spawn("ffmpeg", buildWindowCaptureArgs({
    hwnd: captureWindow.hwnd,
    outputPath: rawCapturePath,
  }), {
    stdio: ["pipe", "pipe", "pipe"],
  });

  const stderr: string[] = [];
  ffmpeg.stderr.on("data", (chunk) => stderr.push(String(chunk)));

  const moments: DemoMoment[] = [];
  const startedAt = Date.now();

  try {
    await firstPage.waitForTimeout(startDelayMs);

    for (const [index, repoExecution] of executionPlan.repoExecutions.entries()) {
      const page = pages.get(repoExecution.tabIndex);
      if (!page) {
        continue;
      }
      await executeRepoPlan(page, repoExecution, executionPlan, startedAt, moments, index === 0);
      await page.waitForTimeout(betweenTabsMs);
    }
  } finally {
    ffmpeg.stdin.write("q");
    ffmpeg.stdin.end();
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        try {
          execFileSync("taskkill", ["/PID", String(ffmpeg.pid), "/T", "/F"], { stdio: "ignore" });
        } catch {
          // ignore
        }
        finish();
      }, 3_000);
      ffmpeg.once("exit", finish);
    });
    await browser.close();
  }

  if (!fs.existsSync(rawCapturePath)) {
    throw new Error(`Desktop capture did not produce ${rawCapturePath}\n${stderr.join("")}`);
  }

  const rawDurationMs = probeVideoDurationMs(rawCapturePath);
  const packaged = await runLiveLocalScreenDemoPipeline({
    rootDir,
    prompt: recordingPlan.capturePrompt,
    recordingPath: rawCapturePath,
    rawDurationMs,
    moments,
    viewport: { width: captureWindow.width, height: captureWindow.height },
    audioManifest,
    repoUrls: recordingPlan.repoUrls,
    renderScreenDemo: skipRender ? async () => undefined : undefined,
  });

  console.log(`Raw desktop capture: ${rawCapturePath}`);
  console.log(`Screen-demo project: ${packaged.project.projectDir}`);
  console.log(`Project recording: ${path.join(packaged.project.projectDir, "recording.mp4")}`);
  console.log(`Action moments: ${packaged.project.momentsPath}`);
  console.log(`Edit config: ${packaged.project.editConfigPath}`);
  if (!skipRender) {
    console.log(`Trimmed demo: ${packaged.project.outputVideoPath}`);
  } else {
    console.log("Skipped Remotion render.");
  }
}

function focusBrowserWindowByTitle(titleFragment: string, since: Date): {
  hwnd: number;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
} {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32Capture {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }
}
"@
$HWND_TOPMOST = [IntPtr](-1)
$HWND_NOTOPMOST = [IntPtr](-2)
$SWP_NOMOVE = 0x0002
$SWP_NOSIZE = 0x0001
$SWP_SHOWWINDOW = 0x0040
$since = [DateTime]::Parse("${since.toISOString()}")
$titleFragment = "${titleFragment.replace(/"/g, '`"')}"
$candidates = @("chrome", "chromium", "msedge")
$processList = foreach ($name in $candidates) {
  Get-Process $name -ErrorAction SilentlyContinue
}
$process = $processList |
  Where-Object { $_.MainWindowHandle -ne 0 -and $_.StartTime -ge $since -and $_.MainWindowTitle -like "*$titleFragment*" } |
  Sort-Object StartTime -Descending |
  Select-Object -First 1
if (-not $process) {
  throw "Could not find the launched browser window to focus."
}
[Win32Capture]::ShowWindow($process.MainWindowHandle, 3) | Out-Null
[Win32Capture]::SetWindowPos($process.MainWindowHandle, $HWND_TOPMOST, 0, 0, 0, 0, ($SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_SHOWWINDOW)) | Out-Null
Start-Sleep -Milliseconds 400
[Win32Capture]::SetForegroundWindow($process.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 400
[Win32Capture]::SetWindowPos($process.MainWindowHandle, $HWND_NOTOPMOST, 0, 0, 0, 0, ($SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_SHOWWINDOW)) | Out-Null
$rect = New-Object Win32Capture+RECT
[Win32Capture]::GetWindowRect($process.MainWindowHandle, [ref]$rect) | Out-Null
@{
  hwnd = [int64]$process.MainWindowHandle
  x = $rect.Left
  y = $rect.Top
  width = $rect.Right - $rect.Left
  height = $rect.Bottom - $rect.Top
  title = $process.MainWindowTitle
} | ConvertTo-Json -Compress
`;

  const raw = execFileSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    script,
  ], { encoding: "utf8" }).trim();

  return JSON.parse(raw) as {
    hwnd: number;
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
