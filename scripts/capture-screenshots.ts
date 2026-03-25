import fs from "fs";
import path from "path";
import { chromium, type Page } from "playwright";
import type { SkillsWeeklyProps } from "../src/lib/episode-types";
import {
  readPngDimensions,
  toRuntimeAssetPath,
} from "../src/lib/image-metadata";
import {
  DEFAULT_CAPTURE_CONFIG,
  buildCaptureUrl,
  buildReadmeFocusScript,
  getScreenshotFailureReason,
  isScreenshotUsable,
  type CaptureConfig,
} from "../src/lib/screenshot-capture";

async function main() {
  const opts = parseArgs();
  const date = getLocalDateStamp();
  const episodeDir = path.join(process.cwd(), "runtime", "episodes", date);
  const manifestPath = path.join(episodeDir, "manifest.json");
  const screenshotsDir = path.join(episodeDir, "screenshots");
  const config = loadConfig();

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest file: ${manifestPath}`);
  }

  fs.mkdirSync(screenshotsDir, { recursive: true });

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  ) as SkillsWeeklyProps;

  const startIndex = Math.max(0, (opts.startAt ?? 1) - 1);
  const tools = manifest.movers.slice(
    startIndex,
    startIndex + (opts.limit ?? manifest.movers.length),
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: config.viewport,
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();

  try {
    for (const tool of tools) {
      const outputPath = path.join(
        screenshotsDir,
        `${sanitizeFileName(tool.slug)}.png`,
      );

      if (fs.existsSync(outputPath) && !config.overwriteExisting && !opts.overwrite) {
        const dimensions = readPngDimensions(fs.readFileSync(outputPath));
        tool.screenshotPath = toRuntimeAssetPath(outputPath);
        tool.screenshotHeight = dimensions.height;
        continue;
      }

      const captureUrl = buildCaptureUrl(tool.clawhubUrl);
      await captureToolScreenshot(page, captureUrl, outputPath, config);

      const dimensions = readPngDimensions(fs.readFileSync(outputPath));
      tool.screenshotPath = toRuntimeAssetPath(outputPath);
      tool.screenshotHeight = dimensions.height;
    }
  } finally {
    await context.close();
    await browser.close();
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`Captured ${tools.length} screenshots`);
  console.log(`Updated manifest: ${manifestPath}`);
}

async function captureToolScreenshot(
  page: Page,
  captureUrl: string,
  outputPath: string,
  config: CaptureConfig,
) {
  await openReadyPage(page, captureUrl, config);
  await focusReadme(page);
  await captureScreenshot(page, outputPath, Boolean(config.fullPage));

  const inspection = inspectScreenshot(outputPath);
  const failureReason = inspection
    ? getScreenshotFailureReason(inspection, config)
    : "missing-file";

  if (!failureReason) {
    return;
  }

  console.warn(`Retrying screenshot for ${captureUrl} because ${failureReason}.`);

  await openReadyPage(page, captureUrl.replace(/#readme$/i, ""), config);
  await focusReadme(page);
  await captureScreenshot(page, outputPath, false);

  const fallbackInspection = inspectScreenshot(outputPath);
  if (!fallbackInspection || !isScreenshotUsable(fallbackInspection, config)) {
    throw new Error(
      `Screenshot capture failed for ${captureUrl}. Last inspection: ${JSON.stringify(
        fallbackInspection ?? null,
      )}`,
    );
  }
}

async function openReadyPage(
  page: Page,
  captureUrl: string,
  config: CaptureConfig,
) {
  await page.goto(captureUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  try {
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
  } catch {
    // Some pages keep background connections alive; a stable DOM is enough for screenshots.
  }

  await page.waitForTimeout(config.waitAfterLoadMs ?? DEFAULT_CAPTURE_CONFIG.waitAfterLoadMs!);
}

async function focusReadme(page: Page) {
  await page.evaluate(buildReadmeFocusScript());
  await page.waitForTimeout(500);
}

async function captureScreenshot(page: Page, outputPath: string, fullPage: boolean) {
  await page.screenshot({
    path: outputPath,
    fullPage,
    animations: "disabled",
  });
}

function inspectScreenshot(outputPath: string) {
  if (!fs.existsSync(outputPath)) {
    return undefined;
  }

  const stats = fs.statSync(outputPath);
  const dimensions = readPngDimensions(fs.readFileSync(outputPath));

  return {
    size: stats.size,
    width: dimensions.width,
    height: dimensions.height,
  };
}

function parseArgs(): { limit?: number; startAt?: number; overwrite?: boolean } {
  const args = process.argv.slice(2);
  const result: { limit?: number; startAt?: number; overwrite?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      result.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--start-at" && args[i + 1]) {
      result.startAt = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--overwrite") {
      result.overwrite = true;
    }
  }

  return result;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:"*?<>|]+/g, "-").replace(/\s+/g, "-");
}

function loadConfig(): CaptureConfig {
  const configPath = path.join(process.cwd(), "runtime", "capture-config.json");

  if (!fs.existsSync(configPath)) {
    return DEFAULT_CAPTURE_CONFIG;
  }

  return {
    ...DEFAULT_CAPTURE_CONFIG,
    ...JSON.parse(fs.readFileSync(configPath, "utf8")),
  } as CaptureConfig;
}

function getLocalDateStamp(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(now);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
