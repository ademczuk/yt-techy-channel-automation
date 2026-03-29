import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { buildTestOutputDir, runGitHubWalkthrough } from "./lib/github-walkthrough";
import { runCommand } from "../src/lib/process-runner";

function getDurationMs(): number {
  const arg = process.argv.find((entry) => entry.startsWith("--duration="));
  const seconds = arg ? Number.parseInt(arg.split("=")[1] ?? "", 10) : 60;
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60_000;
}

async function main() {
  const rootDir = process.cwd();
  const outputDir = buildTestOutputDir(rootDir, "playwright-recording");
  const tempDir = path.join(outputDir, "temp");
  const durationMs = getDurationMs();
  fs.mkdirSync(tempDir, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    slowMo: 40,
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: tempDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  const repoSlug = "bytedance-deer-flow";
  const cuePath = path.join(outputDir, `${repoSlug}.focus-cues.json`);
  await runGitHubWalkthrough(page, {
    repoUrl: "https://github.com/bytedance/deer-flow",
    durationMs,
    cueOutputPath: cuePath,
  });

  const video = page.video();
  await context.close();
  const sourcePath = await video?.path();
  await browser.close();

  if (!sourcePath) {
    throw new Error("Playwright did not produce a video path.");
  }

  const outputPath = path.join(outputDir, `${repoSlug}.mp4`);
  await runCommand("ffmpeg", [
    "-y",
    "-i",
    sourcePath,
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
  ]);

  console.log(`Playwright test video: ${outputPath}`);
  console.log(`Focus cues: ${cuePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
