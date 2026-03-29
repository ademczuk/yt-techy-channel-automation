import fs from "fs";
import os from "os";
import path from "path";
import { spawn, spawnSync } from "node:child_process";
import { chromium, _electron as electron } from "playwright";
import { buildTestOutputDir, runGitHubWalkthrough } from "./lib/github-walkthrough";
import {
  buildRecordlyCaptureDefaults,
  writeRecordlyProjectFile,
} from "../src/lib/recordly-project";
import { detectMostlyBlackVideo } from "../src/lib/video-validation";

function getDurationMs(): number {
  const arg = process.argv.find((entry) => entry.startsWith("--duration="));
  const seconds = arg ? Number.parseInt(arg.split("=")[1] ?? "", 10) : 60;
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60_000;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getRepoLimit(): number {
  const arg = process.argv.find((entry) => entry.startsWith("--limit="));
  const limit = arg ? Number.parseInt(arg.split("=")[1] ?? "", 10) : REPOS.length;
  return Number.isFinite(limit) && limit > 0 ? Math.min(limit, REPOS.length) : REPOS.length;
}

const REPOS = [
  {
    slug: "bytedance-deer-flow",
    repoUrl: "https://github.com/bytedance/deer-flow",
  },
  {
    slug: "nousresearch-hermes-agent",
    repoUrl: "https://github.com/NousResearch/hermes-agent",
  },
] as const;

async function main() {
  const rootDir = process.cwd();
  const outputDir = buildTestOutputDir(rootDir, "recordly");
  const durationMs = getDurationMs();
  const repoLimit = getRepoLimit();
  const repos = REPOS.slice(0, repoLimit);
  const perRepoDurationMs = Math.max(12_000, Math.floor(durationMs / repos.length));
  const captureDefaults = buildRecordlyCaptureDefaults();
  const editorExportEnabled = hasFlag("--editor-export");

  for (const repo of repos) {
    const browser = await chromium.launch({
      headless: false,
      slowMo: 40,
      args: ["--window-size=1440,960"],
    });

    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await page.goto(repo.repoUrl, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(1600);
    const pageTitle = await page.title();

    const app = await electron.launch({
      executablePath: "C:/YT/Code Search/RecordlyApp/Recordly.exe",
    });
    const hud = await app.firstWindow();
    await hud.waitForTimeout(1500);

    const selectedSource = await hud.evaluate(async (payload) => {
      await window.electronAPI.setCountdownDelay(payload.countdownDelay);
      const sources = await window.electronAPI.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: 320, height: 200 },
        fetchWindowIcons: false,
      });

      const target =
        sources.find((source: { name?: string }) => source.name?.includes(payload.targetTitle)) ??
        sources.find((source: { name?: string }) => source.name?.includes("Google Chrome")) ??
        sources.find((source: { sourceType?: string }) => source.sourceType === "screen");

      if (!target) {
        throw new Error(`Could not find a Recordly source for ${payload.targetTitle}`);
      }

      await window.electronAPI.selectSource(target);
      return target;
    }, {
      targetTitle: pageTitle.slice(0, 45),
      countdownDelay: captureDefaults.countdownDelay,
    });

    const startResult = await hud.evaluate(async (source) => {
      return await window.electronAPI.startFfmpegRecording(source);
    }, selectedSource);

    if (!startResult?.success) {
      throw new Error(`Recordly failed to start recording: ${JSON.stringify(startResult)}`);
    }

    const cuePath = path.join(outputDir, `${repo.slug}.focus-cues.json`);
    const cues = await runGitHubWalkthrough(page, {
      repoUrl: repo.repoUrl,
      durationMs: perRepoDurationMs,
      cueOutputPath: cuePath,
    });

    const stopResult = await hud.evaluate(async () => {
      return await window.electronAPI.stopFfmpegRecording();
    });

    if (!stopResult?.success || !stopResult.path) {
      await app.close().catch(() => undefined);
      await context.close();
      await browser.close();
      throw new Error(`Recordly failed to stop recording cleanly: ${JSON.stringify(stopResult)}`);
    }

    await waitForStableFile(stopResult.path);
    const rawOutputPath = path.join(outputDir, `${repo.slug}.raw.mp4`);
    fs.copyFileSync(stopResult.path, rawOutputPath);

    const projectResult = await writeRecordlyProjectFile({
      videoPath: rawOutputPath,
      durationMs: perRepoDurationMs,
      cues,
      outputDir,
    });

    await hud.evaluate(async (projectPath) => {
      const result = await window.electronAPI.openProjectFileAtPath(projectPath);
      if (!result?.success) {
        throw new Error(`Unable to open Recordly project: ${JSON.stringify(result)}`);
      }
      return await window.electronAPI.switchToEditor();
    }, projectResult.projectPath).catch(() => undefined);

    let exportedOutputPath: string | null = null;
    if (editorExportEnabled) {
      exportedOutputPath = await exportThroughRecordlyEditor({
        app,
        outputDir,
        slug: repo.slug,
      });
      assertVideoLooksUsable(exportedOutputPath);
    } else {
      assertVideoLooksUsable(rawOutputPath);
    }

    await app.close().catch(() => undefined);
    await context.close();
    await browser.close();

    console.log(`Recordly raw test capture: ${rawOutputPath}`);
    if (exportedOutputPath) {
      console.log(`Recordly exported test capture: ${exportedOutputPath}`);
    }
    console.log(`Recordly project: ${projectResult.projectPath}`);
    console.log(`Focus cues: ${cuePath}`);
  }
}

async function exportThroughRecordlyEditor(options: {
  app: Awaited<ReturnType<typeof electron.launch>>;
  outputDir: string;
  slug: string;
}): Promise<string> {
  const editorWindow = await waitForEditorWindow(options.app);
  await editorWindow.bringToFront();
  await editorWindow.waitForTimeout(1200);
  await editorWindow.screenshot({
    path: path.join(options.outputDir, `${options.slug}.editor-initial.png`),
  });

  const downloadsDir = path.join(os.homedir(), "Downloads");
  const knownDownloads = new Set(
    fs.existsSync(downloadsDir)
      ? fs.readdirSync(downloadsDir).filter((entry) => /^export-\d+\.mp4$/i.test(entry))
      : [],
  );

  const saveDialogWatcher = armSaveDialogAccept();

  await editorWindow.getByRole("button", { name: /^Export$/ }).click();
  await editorWindow.getByRole("button", { name: /Export Video/i }).click();
  await editorWindow.screenshot({
    path: path.join(options.outputDir, `${options.slug}.editor-export-started.png`),
  });
  await editorWindow.getByText(/Export complete/i).waitFor({ timeout: 180_000 });

  const savedFile = await waitForNewExportedVideo(downloadsDir, knownDownloads);
  await saveDialogWatcher;

  const destinationPath = path.join(options.outputDir, `${options.slug}.exported.mp4`);
  fs.copyFileSync(savedFile, destinationPath);
  return destinationPath;
}

async function waitForEditorWindow(app: Awaited<ReturnType<typeof electron.launch>>) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const windows = app.windows();
    for (const candidate of windows) {
      const title = await candidate.title().catch(() => "");
      if (/Recordly/i.test(title) || /Editor/i.test(title)) {
        const exportButton = candidate.getByRole("button", { name: /^Export$/ });
        if (await exportButton.count().catch(() => 0)) {
          return candidate;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timed out waiting for Recordly editor window");
}

function armSaveDialogAccept(): Promise<void> {
  const command = [
    "$ws = New-Object -ComObject WScript.Shell",
    "$deadline = (Get-Date).AddSeconds(180)",
    "while ((Get-Date) -lt $deadline) {",
    "  if ($ws.AppActivate('Save Exported Video')) {",
    "    Start-Sleep -Milliseconds 700",
    "    $ws.SendKeys('{ENTER}')",
    "    exit 0",
    "  }",
    "  Start-Sleep -Milliseconds 300",
    "}",
    "exit 1",
  ].join("; ");

  return new Promise((resolve, reject) => {
    const child = spawn("powershell", ["-NoProfile", "-Command", command], {
      stdio: "ignore",
      windowsHide: true,
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error("Timed out waiting for the Recordly save dialog"));
      }
    });
  });
}

async function waitForNewExportedVideo(downloadsDir: string, knownDownloads: Set<string>): Promise<string> {
  const deadline = Date.now() + 180_000;

  while (Date.now() < deadline) {
    if (fs.existsSync(downloadsDir)) {
      const candidates = fs
        .readdirSync(downloadsDir)
        .filter((entry) => /^export-\d+\.mp4$/i.test(entry) && !knownDownloads.has(entry))
        .map((entry) => ({
          entry,
          fullPath: path.join(downloadsDir, entry),
          mtimeMs: fs.statSync(path.join(downloadsDir, entry)).mtimeMs,
          size: fs.statSync(path.join(downloadsDir, entry)).size,
        }))
        .filter((entry) => entry.size > 0)
        .sort((left, right) => right.mtimeMs - left.mtimeMs);

      if (candidates.length > 0) {
        await waitForStableFile(candidates[0].fullPath);
        return candidates[0].fullPath;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timed out waiting for Recordly to save the exported MP4");
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

function assertVideoLooksUsable(videoPath: string): void {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-i",
      videoPath,
      "-vf",
      "blackdetect=d=0.1:pic_th=0.98",
      "-an",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );

  const stderr = result.stderr ?? "";

  if (detectMostlyBlackVideo(stderr)) {
    throw new Error(`Recordly capture is mostly black and was rejected: ${videoPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
