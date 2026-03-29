import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import {
  RecordingContext,
  connectCDP,
  launchChrome,
  navigate,
  waitForSelector,
  pause,
  findElementBySelector,
  moveCursorTo,
  Recorder,
  InteractionTimeline,
  compose,
} from "../node_modules/@webreel/core/dist/index.js";
import { buildTestOutputDir } from "./lib/github-walkthrough";
import {
  buildRepoSteps,
  buildWebreelProofConfig,
  inferWebreelFailureStage,
  listWebreelArtifacts,
  type WebreelArtifactReport,
} from "../src/lib/webreel-debug";

type StepStatus = "pending" | "running" | "passed" | "failed" | "skipped";

interface StepState {
  name: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  artifacts: string[];
  error?: string;
}

interface RunnerState {
  startedAt: string;
  outputDir: string;
  tempRoot: string;
  configPath: string;
  steps: StepState[];
}

const REPOS = [
  {
    slug: "bytedance-deer-flow",
    url: "https://github.com/bytedance/deer-flow",
    displayName: "deer-flow",
  },
  {
    slug: "nousresearch-hermes-agent",
    url: "https://github.com/NousResearch/hermes-agent",
    displayName: "hermes-agent",
  },
] as const;

const STEP_NAMES = [
  "prepare_config",
  "validate_config",
  "preview_demo",
  "record_demo",
  "composite_demo",
  "verify_video",
] as const;

async function main() {
  const rootDir = process.cwd();
  const outputDir = buildTestOutputDir(rootDir, "webreel");
  const dateStamp = path.basename(path.dirname(outputDir));
  const tempRoot = path.join("C:\\YT", "webreel-runtime", dateStamp, "proof");
  const configDir = path.join(tempRoot, "config");
  const logsDir = path.join(outputDir, "logs");
  const statePath = path.join(outputDir, "webreel-state.json");
  const configPath = path.join(configDir, "webreel.config.json");
  const cursorPath = path.join(configDir, "windows-cursor.svg");
  const opts = parseArgs();

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });

  const state = createRunnerState(outputDir, tempRoot, configPath);
  writeState(statePath, state);

  try {
    markStep(state, statePath, "prepare_config", "running");
    writeCursorAsset(cursorPath);
    fs.mkdirSync(path.join(configDir, ".webreel", "raw"), { recursive: true });
    fs.mkdirSync(path.join(configDir, ".webreel", "frames"), { recursive: true });
    fs.mkdirSync(path.join(configDir, ".webreel", "timelines"), { recursive: true });
    writeFocusCueFiles(outputDir);
    const config = buildWebreelProofConfig({
      outDir: tempRoot,
      cursorAssetPath: "./windows-cursor.svg",
      repos: [REPOS[0], REPOS[1]],
    });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    markStep(state, statePath, "prepare_config", "passed", [configPath, cursorPath]);

    markStep(state, statePath, "validate_config", "running");
    runWebreelCommand({
      rootDir,
      configDir,
      logsDir,
      logName: "validate.log",
      args: ["validate", "-c", "webreel.config.json"],
    });
    markStep(state, statePath, "validate_config", "passed", [path.join(logsDir, "validate.log")]);

    if (opts.previewOnly) {
      markStep(state, statePath, "preview_demo", "running");
      runWebreelCommand({
        rootDir,
        configDir,
        logsDir,
        logName: "preview.log",
        args: ["preview", REPOS[0].slug, "-c", "webreel.config.json", "--verbose"],
      });
      markStep(state, statePath, "preview_demo", "passed", [path.join(logsDir, "preview.log")]);
      markStep(state, statePath, "record_demo", "skipped");
      markStep(state, statePath, "composite_demo", "skipped");
      markStep(state, statePath, "verify_video", "skipped");
      console.log(`Preview complete. State file: ${statePath}`);
      return;
    }

    markStep(state, statePath, "preview_demo", "skipped");

    markStep(state, statePath, "record_demo", "running");
    try {
      runWebreelCommand({
        rootDir,
        configDir,
        logsDir,
        logName: "record.log",
        args: ["record", ...REPOS.map((repo) => repo.slug), "-c", "webreel.config.json", "--verbose", "--frames"],
      });
    } catch (error) {
      const recordLogPath = path.join(logsDir, "record.log");
      const recordLog = fs.existsSync(recordLogPath) ? fs.readFileSync(recordLogPath, "utf8") : "";
      if (!looksLikeWindowsTempFileBug(recordLog)) {
        throw error;
      }

      fs.writeFileSync(
        path.join(logsDir, "record-fallback.log"),
        `${recordLog}\n\nFALLBACK:\nDetected Webreel Windows temp-file failure. Re-running with visible Chrome via @webreel/core.\n`,
        "utf8",
      );
      await runVisibleChromeFallback({
        configDir,
        outputDir,
        tempRoot,
      });
    }
    const afterRecord = listWebreelArtifacts(configDir, tempRoot);
    fs.writeFileSync(path.join(outputDir, "artifacts-after-record.json"), JSON.stringify(afterRecord, null, 2), "utf8");
    markStep(state, statePath, "record_demo", "passed", collectArtifactPaths(afterRecord, path.join(outputDir, "artifacts-after-record.json")));

    const needsComposite =
      afterRecord.outputFiles.length < REPOS.length &&
      (afterRecord.timelineFiles.length > 0 || afterRecord.rawFiles.length > 0 || afterRecord.frameFiles.length > 0);

    if (needsComposite) {
      markStep(state, statePath, "composite_demo", "running");
      runWebreelCommand({
        rootDir,
        configDir,
        logsDir,
        logName: "composite.log",
        args: ["composite", ...REPOS.map((repo) => repo.slug), "-c", "webreel.config.json"],
      });
      const afterComposite = listWebreelArtifacts(configDir, tempRoot);
      fs.writeFileSync(path.join(outputDir, "artifacts-after-composite.json"), JSON.stringify(afterComposite, null, 2), "utf8");
      markStep(
        state,
        statePath,
        "composite_demo",
        "passed",
        collectArtifactPaths(afterComposite, path.join(outputDir, "artifacts-after-composite.json")),
      );
    } else {
      markStep(state, statePath, "composite_demo", "skipped");
    }

    markStep(state, statePath, "verify_video", "running");
    const finalReport = listWebreelArtifacts(configDir, tempRoot);
    const failureStage = inferWebreelFailureStage(finalReport);
    if (finalReport.outputFiles.length < REPOS.length) {
      throw new Error(
        `Webreel did not produce both MP4s. Likely failure stage: ${failureStage}. See logs in ${logsDir}`,
      );
    }

    const copiedOutputs: string[] = [];
    const verificationSummary: Array<{ file: string; durationMs: number }> = [];
    for (const repo of REPOS) {
      const sourcePath = path.join(tempRoot, `${repo.slug}.mp4`);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Missing expected Webreel output: ${sourcePath}`);
      }
      const normalizedTempPath = path.join(tempRoot, `${repo.slug}.normalized.mp4`);
      normalizeVideoDuration(sourcePath, normalizedTempPath, 15_000);
      const durationMs = readVideoDurationMs(normalizedTempPath);
      if (durationMs < 14_000 || durationMs > 16_500) {
        throw new Error(`Unexpected normalized duration for ${normalizedTempPath}: ${durationMs}ms`);
      }
      const copiedPath = path.join(outputDir, `${repo.slug}.mp4`);
      fs.copyFileSync(normalizedTempPath, copiedPath);
      copiedOutputs.push(copiedPath);
      verificationSummary.push({ file: copiedPath, durationMs });
    }

    const verificationPath = path.join(outputDir, "verification.json");
    fs.writeFileSync(verificationPath, JSON.stringify(verificationSummary, null, 2), "utf8");
    markStep(state, statePath, "verify_video", "passed", [...copiedOutputs, verificationPath]);

    console.log(`Webreel proof clips ready in: ${outputDir}`);
    console.log(`State file: ${statePath}`);
  } catch (error) {
    const activeStep = state.steps.find((step) => step.status === "running");
    if (activeStep) {
      markStep(
        state,
        statePath,
        activeStep.name,
        "failed",
        activeStep.artifacts,
        error instanceof Error ? error.message : String(error),
      );
    }
    throw error;
  }
}

function createRunnerState(outputDir: string, tempRoot: string, configPath: string): RunnerState {
  return {
    startedAt: new Date().toISOString(),
    outputDir,
    tempRoot,
    configPath,
    steps: STEP_NAMES.map((name) => ({
      name,
      status: "pending",
      artifacts: [],
    })),
  };
}

function writeCursorAsset(cursorPath: string) {
  fs.writeFileSync(
    cursorPath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M5 3L5 21L9.7 16.9L12.8 25L16 23.7L12.9 15.9L20 15.8L5 3Z" fill="white" stroke="#111827" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
    "utf8",
  );
}

function writeFocusCueFiles(outputDir: string) {
  const steps = buildRepoSteps();
  for (const repo of REPOS) {
    const focusCuePath = path.join(outputDir, `${repo.slug}.focus-cues.json`);
    fs.writeFileSync(
      focusCuePath,
      JSON.stringify(
        steps
          .filter((step) => "description" in step && "selector" in step)
          .map((step, index) => ({
            label: step.description,
            selector: step.selector,
            stepIndex: index + 1,
          })),
        null,
        2,
      ),
      "utf8",
    );
  }
}

function runWebreelCommand(options: {
  rootDir: string;
  configDir: string;
  logsDir: string;
  logName: string;
  args: string[];
}) {
  const logPath = path.join(options.logsDir, options.logName);
  const command = [
    process.execPath,
    path.join(options.rootDir, "node_modules", "webreel", "dist", "index.js"),
    ...options.args,
  ];
  const result = spawnSync(command[0], command.slice(1), {
    cwd: options.configDir,
    encoding: "utf8",
    shell: false,
  });

  const logBody = [
    `$ ${command.join(" ")}`,
    "",
    "STDOUT:",
    result.stdout ?? "",
    "",
    "STDERR:",
    result.stderr ?? "",
  ].join("\n");
  fs.writeFileSync(logPath, logBody, "utf8");

  if (result.status !== 0) {
    throw new Error(`Webreel command failed (${options.logName}). See ${logPath}`);
  }
}

function collectArtifactPaths(report: WebreelArtifactReport, extra: string): string[] {
  return [...report.outputFiles, ...report.timelineFiles, ...report.rawFiles, ...report.frameFiles, extra];
}

function markStep(
  state: RunnerState,
  statePath: string,
  stepName: string,
  status: StepStatus,
  artifacts: string[] = [],
  error?: string,
) {
  const step = state.steps.find((entry) => entry.name === stepName);
  if (!step) {
    throw new Error(`Unknown step: ${stepName}`);
  }
  if (status === "running") {
    step.startedAt = new Date().toISOString();
  }
  if (status === "passed" || status === "failed" || status === "skipped") {
    step.completedAt = new Date().toISOString();
  }
  step.status = status;
  step.artifacts = artifacts;
  step.error = error;
  writeState(statePath, state);
}

function writeState(statePath: string, state: RunnerState) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
}

function readVideoDurationMs(filePath: string): number {
  const ffprobe = resolveFfprobe();
  const result = spawnSync(
    ffprobe,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    {
      encoding: "utf8",
      shell: false,
    },
  );

  if (result.status !== 0) {
    throw new Error(`ffprobe failed for ${filePath}: ${result.stderr}`);
  }

  const seconds = Number.parseFloat((result.stdout ?? "").trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Could not parse ffprobe duration for ${filePath}`);
  }
  return Math.round(seconds * 1000);
}

function normalizeVideoDuration(inputPath: string, outputPath: string, targetDurationMs: number) {
  const currentDurationMs = readVideoDurationMs(inputPath);
  const factor = targetDurationMs / currentDurationMs;
  const ffmpeg = resolveFfmpeg();
  const result = spawnSync(
    ffmpeg,
    [
      "-y",
      "-i",
      inputPath,
      "-an",
      "-vf",
      `setpts=${factor.toFixed(6)}*PTS`,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath,
    ],
    {
      encoding: "utf8",
      shell: false,
    },
  );

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed to normalize ${inputPath}: ${result.stderr}`);
  }
}

function resolveFfprobe(): string {
  const localFfprobe = path.join(
    os.homedir(),
    ".webreel",
    "bin",
    "ffmpeg",
    "ffmpeg-n7.1-latest-win64-gpl-7.1",
    "bin",
    "ffprobe.exe",
  );
  return fs.existsSync(localFfprobe) ? localFfprobe : "ffprobe";
}

function resolveFfmpeg(): string {
  const localFfmpeg = path.join(
    os.homedir(),
    ".webreel",
    "bin",
    "ffmpeg",
    "ffmpeg-n7.1-latest-win64-gpl-7.1",
    "bin",
    "ffmpeg.exe",
  );
  return fs.existsSync(localFfmpeg) ? localFfmpeg : "ffmpeg";
}

function parseArgs() {
  return {
    previewOnly: process.argv.includes("--preview-only"),
  };
}

function looksLikeWindowsTempFileBug(logBody: string): boolean {
  return logBody.includes("ENOENT") && logBody.includes("\\.webreel\\_rec_");
}

async function runVisibleChromeFallback(options: {
  configDir: string;
  outputDir: string;
  tempRoot: string;
}) {
  const rawDir = path.join(options.configDir, ".webreel", "raw");
  const timelineDir = path.join(options.configDir, ".webreel", "timelines");
  const frameRoot = path.join(options.configDir, ".webreel", "frames");

  for (const repo of REPOS) {
    const width = 1920;
    const height = 1080;
    const ctx = new RecordingContext();
    ctx.resetCursorPosition(width, height);
    ctx.setMode("record");

    const timeline = new InteractionTimeline(width, height, {
      zoom: 1,
      fps: 30,
      initialCursor: ctx.getCursorPosition(),
    });
    ctx.setTimeline(timeline);

    const chrome = await launchChrome({ headless: false });
    const client = await connectCDP(chrome.port);
    const recorder = new Recorder(width, height, {
      fps: 30,
      crf: 12,
      framesDir: path.join(frameRoot, repo.slug),
    });

    try {
      await client.Page.enable();
      await client.Runtime.enable();
      await client.Emulation.setDeviceMetricsOverride({
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });

      await navigate(client, repo.url);
      await waitForSelector(client, '[itemprop="name"] a');
      await pause(300);

      recorder.setTimeline(timeline);
      const fallbackOutputPath = path.join(options.tempRoot, `${repo.slug}.mp4`);
      await recorder.start(client, fallbackOutputPath, ctx);

      for (const step of buildRepoSteps()) {
        await runFallbackStep(client, ctx, step);
        const postDelay = "delay" in step ? step.delay : 900;
        if (postDelay > 0) {
          await pause(postDelay);
        }
      }

      await recorder.stop();

      const rawTempPath = recorder.getTempVideoPath();
      const rawOutputPath = path.join(rawDir, `${repo.slug}.mp4`);
      fs.copyFileSync(rawTempPath, rawOutputPath);
      fs.writeFileSync(
        path.join(timelineDir, `${repo.slug}.timeline.json`),
        JSON.stringify(timeline.toJSON()),
        "utf8",
      );
      await compose(rawOutputPath, timeline.toJSON(), fallbackOutputPath);
    } finally {
      try {
        await client.close();
      } catch {
        // ignore cleanup failures
      }
      chrome.kill();
    }
  }
}

async function runFallbackStep(
  client: Awaited<ReturnType<typeof connectCDP>>,
  ctx: RecordingContext,
  step: ReturnType<typeof buildRepoSteps>[number],
) {
  switch (step.action) {
    case "pause":
      await pause(step.ms);
      return;
    case "moveTo":
    case "hover": {
      const box = await findElementBySelector(client, step.selector);
      if (!box) {
        throw new Error(`Element not found: ${step.selector}`);
      }
      const x = Math.round(box.x + box.width / 2);
      const y = Math.round(box.y + box.height / 2);
      await moveCursorTo(ctx, client, x, y);
      await client.Input.dispatchMouseEvent({
        type: "mouseMoved",
        x,
        y,
      });
      return;
    }
    case "scroll":
      await client.Runtime.evaluate({
        expression: `window.scrollBy({ left: ${step.x ?? 0}, top: ${step.y ?? 0}, behavior: "smooth" })`,
      });
      await pause(500);
      return;
    default:
      throw new Error(`Unsupported fallback step action: ${(step as { action: string }).action}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
