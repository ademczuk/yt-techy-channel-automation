import path from "path";
import { execFileSync } from "node:child_process";
import puppeteer, { type Browser, type ElementHandle, type Page } from "puppeteer-core";
import Steel from "steel-sdk";
import type { Session } from "steel-sdk/resources/sessions";
import type { BrowsePlan, BrowseStep, DemoMoment } from "./screen-demo-types";
import { normalizeMomentsToRecordingDuration, writeJsonFile } from "./screen-demo-harness";
import { buildCircularMousePath, buildSafeMouseWaypoints } from "./screen-demo-motion";

export interface RunSteelRecordingInput {
  apiKey: string;
  plan: BrowsePlan;
  projectDir: string;
}

export interface SteelRecordingResult {
  session: Session;
  moments: DemoMoment[];
  sessionPath: string;
  momentsPath: string;
  recordingPath: string;
  rawDurationMs: number;
}

export async function runSteelRecording(
  input: RunSteelRecordingInput,
): Promise<SteelRecordingResult> {
  const client = new Steel({ steelAPIKey: input.apiKey });
  const session = await client.sessions.create({
    headless: false,
    timeout: 900000,
    dimensions: input.plan.viewport,
    debugConfig: {
      interactive: false,
      systemCursor: true,
    },
    stealthConfig: {
      humanizeInteractions: true,
    },
  });

  const connectUrl = `wss://connect.steel.dev?apiKey=${encodeURIComponent(input.apiKey)}&sessionId=${encodeURIComponent(session.id)}`;
  const browser = await puppeteer.connect({
    browserWSEndpoint: connectUrl,
    defaultViewport: input.plan.viewport,
  });

  const page = await ensurePage(browser);
  const startedAt = Date.now();
  const moments: DemoMoment[] = [];
  let finalizedSession: Session | null = null;
  let optionalNavigationOpen = false;
  let cursorPosition = {
    x: Math.round(input.plan.viewport.width * 0.5),
    y: Math.round(input.plan.viewport.height * 0.28),
  };

  try {
    for (const step of input.plan.steps) {
      const timeMs = Date.now() - startedAt;
      const outcome = await executeStep(page, step, optionalNavigationOpen, cursorPosition);
      optionalNavigationOpen = outcome.optionalNavigationOpen;
      cursorPosition = outcome.cursorPosition;
      const endMs = Date.now() - startedAt;

      if (outcome.record) {
        moments.push({
          timeMs,
          endMs,
          action: step.action,
          label: step.label,
          selector: step.selector ?? step.selectorCandidates?.[0],
          url: await safePageUrl(page),
          bounds: outcome.bounds ?? undefined,
        });
      }
    }
  } finally {
    await browser.close();
    await client.sessions.release(session.id);
    finalizedSession = await client.sessions.retrieve(session.id);
  }

  const sessionPath = `${input.projectDir}\\session.json`;
  const momentsPath = `${input.projectDir}\\moments.json`;
  const recordingPath = path.join(input.projectDir, "recording.mp4");

  downloadSteelRecording({
    apiKey: input.apiKey,
    sessionId: session.id,
    outputPath: recordingPath,
  });

  const rawDurationMs = probeVideoDurationMs(recordingPath);
  const normalizedMoments = normalizeMomentsToRecordingDuration(moments, rawDurationMs);

  writeJsonFile(sessionPath, finalizedSession ?? session);
  writeJsonFile(momentsPath, normalizedMoments);

  return {
    session: finalizedSession ?? session,
    moments: normalizedMoments,
    sessionPath,
    momentsPath,
    recordingPath,
    rawDurationMs,
  };
}

export function ensureSteelApiKey(): string {
  const value = process.env.STEEL_API_KEY?.trim();
  if (!value || value === "your_steel_api_key_here") {
    throw new Error("STEEL_API_KEY is not set. Run `npm run screen-demo:setup` and add it to your environment.");
  }
  return value;
}

async function ensurePage(browser: Browser): Promise<Page> {
  const pages = await browser.pages();
  if (pages.length > 0) {
    return pages[0];
  }
  return browser.newPage();
}

async function executeStep(
  page: Page,
  step: BrowseStep,
  optionalNavigationOpen: boolean,
  cursorPosition: { x: number; y: number },
): Promise<{
  record: boolean;
  bounds?: { x: number; y: number; width: number; height: number };
  optionalNavigationOpen: boolean;
  cursorPosition: { x: number; y: number };
}> {
  if (step.action === "navigate" && step.url) {
    await page.goto(step.url, { waitUntil: "domcontentloaded" });
    return { record: true, optionalNavigationOpen: false, cursorPosition };
  }

  if (step.action === "wait") {
    if (step.optional && !optionalNavigationOpen) {
      return { record: false, optionalNavigationOpen, cursorPosition };
    }
    await sleep(step.durationMs ?? 1000);
    return { record: true, optionalNavigationOpen, cursorPosition };
  }

  if (step.action === "scroll") {
    await smoothScrollPage(page, step.deltaY ?? 400, step.durationMs ?? 1200);
    return { record: true, optionalNavigationOpen, cursorPosition };
  }

  if (step.action === "goBack") {
    if (step.optional && !optionalNavigationOpen) {
      return { record: false, optionalNavigationOpen, cursorPosition };
    }
    await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => undefined);
    return { record: true, optionalNavigationOpen: false, cursorPosition };
  }

  const handle = await resolveElement(page, step);
  if (!handle) {
    if (step.optional) {
      return { record: false, optionalNavigationOpen: false, cursorPosition };
    }
    throw new Error(`Could not resolve element for step ${step.label}`);
  }

  const bounds = await getElementBounds(handle);
  if (!bounds) {
    if (step.optional) {
      await handle.dispose();
      return { record: false, optionalNavigationOpen: false, cursorPosition };
    }
    throw new Error(`Resolved element has no bounds for step ${step.label}`);
  }

  await handle.evaluate((element) => {
    element.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  });
  await sleep(250);
  const center = toCenter(bounds);
  cursorPosition = await moveMouseToTarget(page, cursorPosition, center);
  await sleep(120);

  if (step.action === "hover") {
    await handle.hover();
    await sleep(250);
    if ((step.circleCount ?? 0) > 0) {
      cursorPosition = await drawMouseCircles(
        page,
        center,
        Math.max(18, Math.min(bounds.width, bounds.height) * 0.45),
        step.circleCount ?? 1,
      );
    }
    await handle.dispose();
    return { record: true, bounds, optionalNavigationOpen, cursorPosition };
  }

  if (step.action === "click") {
    await handle.click({ delay: 60 });
    await sleep(300);
    await handle.dispose();
    return {
      record: true,
      bounds,
      optionalNavigationOpen: step.optional === true,
      cursorPosition: center,
    };
  }

  if (step.action === "type" && step.text) {
    await handle.click({ delay: 60 });
    await page.keyboard.type(step.text, { delay: 55 });
    await handle.dispose();
    return { record: true, bounds, optionalNavigationOpen, cursorPosition: center };
  }

  await handle.dispose();
  return { record: true, bounds, optionalNavigationOpen, cursorPosition };
}

async function resolveElement(page: Page, step: BrowseStep): Promise<ElementHandle<Element> | null> {
  const selectors = step.selector ? [step.selector] : step.selectorCandidates ?? [];
  for (const selector of selectors) {
    const handle = await page.$(selector);
    if (handle) {
      return handle;
    }
  }
  return null;
}

async function getElementBounds(handle: ElementHandle<Element>) {
  const box = await handle.boundingBox();
  if (!box) {
    return undefined;
  }
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
  };
}

async function safePageUrl(page: Page): Promise<string | undefined> {
  try {
    return page.url();
  } catch {
    return undefined;
  }
}

async function smoothScrollPage(page: Page, deltaY: number, durationMs: number) {
  await page.evaluate(
    async ({ deltaY: totalDeltaY, durationMs: totalDurationMs }) => {
      const segments = Math.max(8, Math.ceil(Math.abs(totalDeltaY) / 90));
      const stepDelta = totalDeltaY / segments;
      const waitMs = Math.max(24, Math.round(totalDurationMs / segments));
      for (let index = 0; index < segments; index += 1) {
        window.scrollBy({ top: stepDelta, left: 0, behavior: "smooth" });
        await new Promise((resolve) => window.setTimeout(resolve, waitMs));
      }
    },
    { deltaY, durationMs },
  );
}

async function drawMouseCircles(
  page: Page,
  center: { x: number; y: number },
  radius: number,
  loops: number,
) {
  const fullPath = buildCircularMousePath(center, radius, loops);
  const points = fullPath.filter((_, index) => index === 0 || index === fullPath.length - 1 || index % 8 === 0);
  for (const point of points) {
    await page.mouse.move(point.x, point.y, { steps: 2 });
  }
  return points.at(-1) ?? center;
}

function toCenter(bounds: { x: number; y: number; width: number; height: number }) {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

async function moveMouseToTarget(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const waypoints = buildSafeMouseWaypoints(from, to);
  let current = from;
  for (const waypoint of waypoints) {
    const distance = Math.hypot(waypoint.x - current.x, waypoint.y - current.y);
    const steps = Math.max(6, Math.min(20, Math.round(distance / 75)));
    await page.mouse.move(waypoint.x, waypoint.y, { steps });
    current = waypoint;
  }
  return to;
}

function downloadSteelRecording(input: {
  apiKey: string;
  sessionId: string;
  outputPath: string;
}): void {
  const hlsUrl = `https://api.steel.dev/v1/sessions/${encodeURIComponent(input.sessionId)}/hls`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      execFileSync("ffmpeg", [
        "-y",
        "-headers",
        `steel-api-key: ${input.apiKey}\r\n`,
        "-i",
        hlsUrl,
        "-c",
        "copy",
        input.outputPath,
      ]);
      return;
    } catch (error) {
      lastError = error;
      sleepMs(attempt * 1500);
    }
  }

  throw formatSteelDownloadError(lastError);
}

function formatSteelDownloadError(error: unknown): Error {
  if (error instanceof Error) {
    return new Error(`Failed to export Steel recording after retries.\n${error.message}`);
  }
  return new Error("Failed to export Steel recording after retries.");
}

function sleepMs(durationMs: number): void {
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    // short-lived blocking retry loop for HLS readiness
  }
}

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function probeVideoDurationMs(videoPath: string): number {
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
