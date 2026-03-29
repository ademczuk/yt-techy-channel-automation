import fs from "fs";
import path from "path";
import { chromium, _electron as electron } from "playwright";
import { buildTestOutputDir, runGitHubWalkthrough } from "./lib/github-walkthrough";
import { buildRecordlyCaptureDefaults, writeRecordlyProjectFile } from "../src/lib/recordly-project";

const REPO_URL = "https://github.com/bytedance/deer-flow";
const REPO_SLUG = "bytedance-deer-flow-manual";
const DURATION_MS = 10_000;

type ManualDebugState = {
  status:
    | "starting"
    | "recording"
    | "recorded"
    | "opening_editor"
    | "editor_ready"
    | "error";
  note?: string;
  rawOutputPath?: string;
  projectPath?: string;
  repoUrl?: string;
  updatedAt: string;
};

async function main() {
  const rootDir = process.cwd();
  const outputDir = buildTestOutputDir(rootDir, "recordly-manual-debug");
  const statePath = path.join(outputDir, "manual-debug-state.json");
  const captureDefaults = buildRecordlyCaptureDefaults();

  writeState(statePath, {
    status: "starting",
    note: "Launching browser and Recordly",
    repoUrl: REPO_URL,
  });

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: ["--window-size=1440,960"],
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  await page.goto(REPO_URL, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(1500);
  const pageTitle = await page.title();

  const app = await electron.launch({
    executablePath: "C:/YT/Code Search/RecordlyApp/Recordly.exe",
  });
  const hud = await app.firstWindow();
  await hud.waitForTimeout(1500);

  const selectedSource = await hud.evaluate(
    async ({ targetTitle, countdownDelay }: { targetTitle: string; countdownDelay: number }) => {
      await window.electronAPI.setCountdownDelay(countdownDelay);
      const sources = await window.electronAPI.getSources({
        types: ["window"],
        thumbnailSize: { width: 320, height: 200 },
        fetchWindowIcons: false,
      });

      const target =
        sources.find((source: { name?: string }) => source.name?.includes(targetTitle)) ??
        sources.find((source: { name?: string }) => source.name?.includes("Google Chrome"));

      if (!target) {
        throw new Error(`Could not find a Recordly window source for ${targetTitle}`);
      }

      await window.electronAPI.selectSource(target);
      return target;
    },
    {
      targetTitle: pageTitle.slice(0, 45),
      countdownDelay: captureDefaults.countdownDelay,
    },
  );

  const startResult = await hud.evaluate(async (source) => {
    return await window.electronAPI.startFfmpegRecording(source);
  }, selectedSource);

  if (!startResult?.success) {
    throw new Error(`Recordly failed to start recording: ${JSON.stringify(startResult)}`);
  }

  writeState(statePath, {
    status: "recording",
    note: "Recording selected window for 10 seconds",
    repoUrl: REPO_URL,
  });

  await runGitHubWalkthrough(page, {
    repoUrl: REPO_URL,
    durationMs: DURATION_MS,
    cueOutputPath: path.join(outputDir, `${REPO_SLUG}.focus-cues.json`),
  });

  const stopResult = await hud.evaluate(async () => {
    return await window.electronAPI.stopFfmpegRecording();
  });

  if (!stopResult?.success || !stopResult.path) {
    throw new Error(`Recordly failed to stop recording cleanly: ${JSON.stringify(stopResult)}`);
  }

  await waitForStableFile(stopResult.path);
  const rawOutputPath = path.join(outputDir, `${REPO_SLUG}.raw.mp4`);
  fs.copyFileSync(stopResult.path, rawOutputPath);

  writeState(statePath, {
    status: "recorded",
    note: "Recording stopped, preparing editor handoff",
    rawOutputPath,
    repoUrl: REPO_URL,
  });

  const projectResult = await writeRecordlyProjectFile({
    videoPath: rawOutputPath,
    durationMs: DURATION_MS,
    cues: [],
    outputDir,
  });

  writeState(statePath, {
    status: "opening_editor",
    note: "Opening Recordly editor and stopping automation",
    rawOutputPath,
    projectPath: projectResult.projectPath,
    repoUrl: REPO_URL,
  });

  try {
    await hud.evaluate(async (videoPath) => {
      await window.electronAPI.setCurrentVideoPath(videoPath);
      await window.electronAPI.switchToEditor();
    }, rawOutputPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Target page, context or browser has been closed")) {
      throw error;
    }
  }

  const editorWindow = await waitForEditorWindow(app);
  await editorWindow.bringToFront();

  writeState(statePath, {
    status: "editor_ready",
    note: "Editor opened. Automation intentionally stopped for manual debugging.",
    rawOutputPath,
    projectPath: projectResult.projectPath,
    repoUrl: REPO_URL,
  });

  console.log(`Recordly editor ready for manual debugging.`);
  console.log(`State file: ${statePath}`);
  console.log(`Raw video: ${rawOutputPath}`);
  console.log(`Project: ${projectResult.projectPath}`);

  await new Promise(() => undefined);
}

async function waitForStableFile(filePath: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  let previousSize = -1;

  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) {
      const currentSize = fs.statSync(filePath).size;
      if (currentSize > 0 && currentSize === previousSize) {
        return;
      }
      previousSize = currentSize;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for stable Recordly output: ${filePath}`);
}

async function waitForEditorWindow(app: Awaited<ReturnType<typeof electron.launch>>) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    for (const candidate of app.windows()) {
      const exportButton = candidate.getByRole("button", { name: /^Export$/ });
      if (await exportButton.count().catch(() => 0)) {
        return candidate;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timed out waiting for the Recordly editor window");
}

function writeState(
  statePath: string,
  state: Omit<ManualDebugState, "updatedAt">,
): void {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(
    statePath,
    JSON.stringify(
      {
        ...state,
        updatedAt: new Date().toISOString(),
      } satisfies ManualDebugState,
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const outputDir = buildTestOutputDir(process.cwd(), "recordly-manual-debug");
  const statePath = path.join(outputDir, "manual-debug-state.json");
  writeState(statePath, {
    status: "error",
    note: error instanceof Error ? error.message : String(error),
    repoUrl: REPO_URL,
  });
  console.error(error);
  process.exit(1);
});
