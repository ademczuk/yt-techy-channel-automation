import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runLiveLocalScreenDemoPipeline } from "../src/lib/live-local-screen-demo";

test("runLiveLocalScreenDemoPipeline reuses the screen-demo project contract for a local recording", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "live-local-screen-demo-"));
  const rawRecordingPath = path.join(rootDir, "desktop-raw.mp4");
  fs.writeFileSync(rawRecordingPath, "raw-video", "utf8");

  let renderCalls = 0;
  const result = await runLiveLocalScreenDemoPipeline({
    rootDir,
    prompt: "Create a polished demo for https://github.com/bytedance/deer-flow",
    recordingPath: rawRecordingPath,
    rawDurationMs: 7600,
    moments: [
      { timeMs: 1000, endMs: 1800, action: "hover", label: "repo-title" },
      { timeMs: 2400, endMs: 2900, action: "click", label: "readme-link" },
      { timeMs: 7000, endMs: 7600, action: "scroll", label: "readme-scroll" },
    ],
    viewport: { width: 1920, height: 1080 },
    renderScreenDemo: async ({ outputPath }) => {
      renderCalls += 1;
      fs.writeFileSync(outputPath, "rendered-demo", "utf8");
    },
    now: new Date("2026-03-29T22:00:00.000Z"),
  });

  assert.equal(renderCalls, 1);
  assert.ok(fs.existsSync(result.project.browsePlanPath));
  assert.ok(fs.existsSync(result.project.scriptPath));
  assert.ok(fs.existsSync(result.project.momentsPath));
  assert.ok(fs.existsSync(result.project.editConfigPath));
  assert.ok(fs.existsSync(result.project.renderPropsPath));
  assert.ok(fs.existsSync(result.project.outputVideoPath));
  assert.ok(fs.existsSync(path.join(result.project.projectDir, "recording.mp4")));
  assert.ok(fs.existsSync(result.publicRecordingPath));

  const renderProps = JSON.parse(fs.readFileSync(result.project.renderPropsPath, "utf8")) as {
    recordingSrc: string;
    viewport: { width: number; height: number };
  };
  assert.match(renderProps.recordingSrc, /\/screen-demos\/.+\/recording\.mp4$/);
  assert.equal(renderProps.viewport.width, 1920);

  const editConfig = JSON.parse(fs.readFileSync(result.project.editConfigPath, "utf8")) as {
    playbackRate: number;
    clips: Array<{ startMs: number; endMs: number }>;
  };
  assert.equal(editConfig.playbackRate, 1);
  assert.equal(editConfig.clips.length, 2);
});

test("runLiveLocalScreenDemoPipeline carries narration audio into render props with intro lead-in", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "live-local-screen-demo-audio-"));
  const rawRecordingPath = path.join(rootDir, "desktop-raw.mp4");
  const audioDir = path.join(rootDir, "runtime", "runs", "2026-03-29", "run-audio-001", "audio");
  fs.mkdirSync(audioDir, { recursive: true });
  fs.writeFileSync(rawRecordingPath, "raw-video", "utf8");
  fs.writeFileSync(path.join(audioDir, "intro.mp3"), "intro-audio", "utf8");
  fs.writeFileSync(path.join(audioDir, "repo-one.mp3"), "repo-audio", "utf8");

  const result = await runLiveLocalScreenDemoPipeline({
    rootDir,
    prompt: "Create a polished demo for https://github.com/bytedance/deer-flow",
    recordingPath: rawRecordingPath,
    rawDurationMs: 12000,
    moments: [
      { timeMs: 1000, endMs: 1800, action: "navigate", label: "repo-open", url: "https://github.com/bytedance/deer-flow" },
      { timeMs: 2500, endMs: 3200, action: "scroll", label: "repo-scroll", url: "https://github.com/bytedance/deer-flow" },
    ],
    viewport: { width: 1920, height: 1080 },
    audioManifest: {
      provider: "openai",
      generatedAt: "2026-03-29T22:00:00.000Z",
      totalDurationMs: 6800,
      segments: [
        {
          id: "intro",
          label: "Intro",
          path: path.join(audioDir, "intro.mp3"),
          durationMs: 1800,
        },
        {
          id: "repo-bytedance-deer-flow",
          label: "deer-flow",
          path: path.join(audioDir, "repo-one.mp3"),
          durationMs: 4200,
        },
      ],
    },
    repoUrls: ["https://github.com/bytedance/deer-flow"],
    renderScreenDemo: async ({ outputPath }) => {
      fs.writeFileSync(outputPath, "rendered-demo", "utf8");
    },
    now: new Date("2026-03-29T22:10:00.000Z"),
  });

  const renderProps = JSON.parse(fs.readFileSync(result.project.renderPropsPath, "utf8")) as {
    recordingSrc: string;
    audioTracks?: Array<{ src: string; startMs: number; durationMs: number }>;
    visualOffsetMs?: number;
    clips: Array<{ timelineDurationMs?: number }>;
  };

  assert.match(renderProps.recordingSrc, /\/screen-demos\/.+\/recording\.mp4$/);
  assert.equal(renderProps.visualOffsetMs, 2400);
  assert.equal(renderProps.audioTracks?.length, 2);
  assert.equal(renderProps.audioTracks?.[0]?.startMs, 0);
  assert.equal(renderProps.audioTracks?.[1]?.startMs, 2400);
  assert.equal(renderProps.clips[0]?.timelineDurationMs, 4600);
  assert.ok(fs.existsSync(path.join(result.project.projectDir, "audio", "intro.mp3")));
  assert.ok(fs.existsSync(path.join(result.project.projectDir, "audio", "repo-one.mp3")));
});
