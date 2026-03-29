import fs from "fs";
import path from "path";
import { buildTestOutputDir } from "./lib/github-walkthrough";
import { execFileSync } from "child_process";

function getDurationFrames(): number {
  const arg = process.argv.find((entry) => entry.startsWith("--duration="));
  const seconds = arg ? Number.parseInt(arg.split("=")[1] ?? "", 10) : 60;
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
  return safeSeconds * 30;
}

async function main() {
  const rootDir = process.cwd();
  const outputDir = buildTestOutputDir(rootDir, "current-project");
  const manifestPath = path.join(outputDir, "manifest.json");
  const outputPath = path.join(outputDir, "current-project-baseline.mp4");
  const durationFrames = getDurationFrames();

  const screenshotPath = "runtime/episodes/2026-03-24/screenshots/bytedance-deer-flow.png";
  const screenshotHeight = 16961;

  const manifest = {
    episodeNumber: 999,
    weekLabel: "Current project baseline test",
    generatedAt: new Date().toISOString(),
    fps: 30,
    movers: [
      {
        slug: "bytedance/deer-flow",
        displayName: "deer-flow",
        summary: "An open-source SuperAgent harness that researches, codes, and creates.",
        author: "bytedance",
        downloads: 0,
        stars: 3546,
        installsCurrent: 0,
        installsAllTime: 0,
        clawhubUrl: "https://github.com/bytedance/deer-flow",
        createdAt: new Date().toISOString(),
        track: "mover",
        rank: 1,
        script: "deer-flow is the current synthetic baseline for the project, using the existing screenshot motion and cursor path without live browser recording.",
        screenshotPath,
        screenshotHeight,
        audioPath: "",
        audioDurationMs: 0,
      },
    ],
    rockets: [],
    catalog: [],
    openclawProject: [],
    introScript: "",
    introAudioPath: "",
    introAudioDurationMs: 0,
    pulseScript: "",
    pulseAudioPath: "",
    pulseAudioDurationMs: 0,
    moversHeaderScript: "",
    moversHeaderAudioPath: "",
    moversHeaderAudioDurationMs: 0,
    rocketsHeaderScript: "",
    rocketsHeaderAudioPath: "",
    rocketsHeaderAudioDurationMs: 0,
    outroScript: "",
    outroAudioPath: "",
    outroAudioDurationMs: 0,
    backgroundMusicPath: "",
    backgroundMusicVolume: 0,
    introDurationFrames: 1,
    pulseDurationFrames: 1,
    sectionHeaderDurationFrames: 1,
    outroDurationFrames: 1,
    defaultSkillDurationFrames: durationFrames,
    transitionDurationFrames: 0,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "render.ts",
      "--manifest",
      manifestPath,
      "--output",
      outputPath,
      "--crf",
      "20",
    ],
    { cwd: rootDir, stdio: "inherit" },
  );

  console.log(`Current project baseline: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
