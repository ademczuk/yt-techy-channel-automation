import { execFileSync } from "node:child_process";
import { EditConfigSchema, type DemoMoment } from "./screen-demo-types";
import { deriveClipSegments, normalizeMomentsToRecordingDuration } from "./screen-demo-harness";
import type { Page } from "playwright";

export interface BrowserWindowMetrics {
  screenX: number;
  screenY: number;
  outerWidth: number;
  outerHeight: number;
  innerWidth: number;
  innerHeight: number;
}

export function buildFullscreenBrowserLaunchArgs(viewport: { width: number; height: number }): string[] {
  return [
    "--start-maximized",
    "--start-fullscreen",
    "--disable-gpu",
    "--disable-direct-composition",
    "--disable-accelerated-2d-canvas",
    "--disable-gpu-compositing",
    `--window-position=0,0`,
    `--window-size=${viewport.width},${viewport.height}`,
  ];
}

export function buildWindowCaptureArgs(input: {
  hwnd: number;
  outputPath: string;
}): string[] {
  return [
    "-y",
    "-f",
    "gdigrab",
    "-framerate",
    "30",
    "-draw_mouse",
    "1",
    "-i",
    `hwnd=${input.hwnd}`,
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    input.outputPath,
  ];
}

export function buildRegionCaptureArgs(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  outputPath: string;
}): string[] {
  return [
    "-y",
    "-f",
    "gdigrab",
    "-framerate",
    "30",
    "-draw_mouse",
    "1",
    "-offset_x",
    `${input.x}`,
    "-offset_y",
    `${input.y}`,
    "-video_size",
    `${input.width}x${input.height}`,
    "-i",
    "desktop",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    input.outputPath,
  ];
}

export function probeVideoDurationMs(videoPath: string): number {
  const raw = execFileSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=nw=1:nk=1",
    videoPath,
  ], { encoding: "utf8" }).trim();

  const durationSeconds = Number.parseFloat(raw);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(`Could not determine recording duration for ${videoPath}`);
  }

  return Math.round(durationSeconds * 1000);
}

export function buildTrimmedLivePlaywrightEditConfig(
  moments: DemoMoment[],
  recordingDurationMs: number,
  backgroundMode: "dark" | "light" = "dark",
): {
  normalizedMoments: DemoMoment[];
  editConfig: {
    playbackRate: number;
    fps: number;
    clips: ReturnType<typeof deriveClipSegments>;
    camera: [];
    backgroundMode: "dark" | "light";
  };
} {
  const normalizedMoments = normalizeMomentsToRecordingDuration(moments, recordingDurationMs);
  const editConfig = EditConfigSchema.parse({
    playbackRate: 1,
    fps: 60,
    clips: deriveClipSegments(normalizedMoments, recordingDurationMs),
    camera: [],
    backgroundMode,
  });

  return {
    normalizedMoments,
    editConfig,
  };
}

export async function smoothScrollPage(page: Page, deltaY: number, durationMs: number): Promise<void> {
  await page.evaluate(
    ({ deltaY: totalDeltaY, durationMs: totalDurationMs }) => {
      document.documentElement.style.scrollBehavior = "smooth";
      document.body.style.scrollBehavior = "smooth";
      window.scrollBy({
        top: totalDeltaY,
        left: 0,
        behavior: "smooth",
      });
      return totalDurationMs;
    },
    { deltaY, durationMs },
  );
  await page.waitForTimeout(durationMs);
}

export function isRedundantSelfClick(currentUrl: string, href: string | null | undefined): boolean {
  if (!href) {
    return false;
  }

  try {
    const current = new URL(currentUrl);
    const target = new URL(href, currentUrl);
    current.hash = "";
    target.hash = "";
    return current.toString() === target.toString();
  } catch {
    return false;
  }
}

export function isRepoScopedLink(currentUrl: string, href: string | null | undefined): boolean {
  if (!href) {
    return false;
  }

  try {
    const current = new URL(currentUrl);
    const target = new URL(href, currentUrl);
    if (current.host !== target.host) {
      return false;
    }

    const currentPathParts = current.pathname.split("/").filter(Boolean);
    const repoRoot = `/${currentPathParts.slice(0, 2).join("/")}`;
    return target.pathname === repoRoot || target.pathname.startsWith(`${repoRoot}/`);
  } catch {
    return false;
  }
}

export function isBoxMostlyVisibleInViewport(
  box: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number },
): boolean {
  return (
    box.width > 0
    && box.height > 0
    && box.x < viewport.width
    && box.y < viewport.height
    && (box.x + Math.min(box.width, 24)) > 0
    && (box.y + Math.min(box.height, 24)) > 0
  );
}

export function resolveSafeBrowserScreenPoint(
  metrics: BrowserWindowMetrics,
  viewportPoint: { x: number; y: number },
): { screenX: number; screenY: number } | null {
  if (
    viewportPoint.x < 0
    || viewportPoint.y < 0
    || viewportPoint.x > metrics.innerWidth
    || viewportPoint.y > metrics.innerHeight
  ) {
    return null;
  }

  const horizontalBorder = Math.max(0, (metrics.outerWidth - metrics.innerWidth) / 2);
  const verticalChrome = Math.max(0, metrics.outerHeight - metrics.innerHeight - horizontalBorder);
  const clientLeft = metrics.screenX + horizontalBorder;
  const clientTop = metrics.screenY + verticalChrome;
  const minX = Math.round(clientLeft + 4);
  const minY = Math.round(clientTop + 4);
  const maxX = Math.round(clientLeft + metrics.innerWidth - 4);
  const maxY = Math.round(clientTop + metrics.innerHeight - 4);

  return {
    screenX: Math.max(minX, Math.min(maxX, Math.round(clientLeft + viewportPoint.x))),
    screenY: Math.max(minY, Math.min(maxY, Math.round(clientTop + viewportPoint.y))),
  };
}

export function resolveSafeBrowserChromePoint(
  metrics: BrowserWindowMetrics,
  chromePoint: { x: number; y: number },
): { screenX: number; screenY: number } | null {
  const horizontalBorder = Math.max(0, (metrics.outerWidth - metrics.innerWidth) / 2);
  const verticalChrome = Math.max(0, metrics.outerHeight - metrics.innerHeight - horizontalBorder);
  if (verticalChrome <= 0) {
    return null;
  }

  if (
    chromePoint.x < 0
    || chromePoint.y < 0
    || chromePoint.x > metrics.outerWidth
    || chromePoint.y > verticalChrome
  ) {
    return null;
  }

  const minX = Math.round(metrics.screenX + 4);
  const maxX = Math.round(metrics.screenX + metrics.outerWidth - 4);
  const minY = Math.round(metrics.screenY + 4);
  const maxY = Math.round(metrics.screenY + verticalChrome - 4);

  return {
    screenX: Math.max(minX, Math.min(maxX, Math.round(metrics.screenX + chromePoint.x))),
    screenY: Math.max(minY, Math.min(maxY, Math.round(metrics.screenY + chromePoint.y))),
  };
}
