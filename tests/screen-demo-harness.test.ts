import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  buildDraftBrowsePlan,
  buildScreenDemoScript,
  buildNarrationBeats,
  buildEditConfig,
  createScreenDemoProject,
  deriveCameraKeyframes,
  deriveClipSegments,
  normalizeMomentsToRecordingDuration,
} from "../src/lib/screen-demo-harness";
import type { DemoMoment } from "../src/lib/screen-demo-types";

test("createScreenDemoProject creates a unique artifact directory", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "screen-demo-"));
  const project = createScreenDemoProject({
    rootDir: tempRoot,
    instructions: "Build a demo for https://github.com/remotion-dev/remotion",
    now: new Date("2026-03-28T03:00:00Z"),
  });

  assert.ok(fs.existsSync(project.projectDir));
  assert.ok(fs.existsSync(project.promptPath));
  assert.match(project.projectDir, /screen-demos/);
});

test("buildDraftBrowsePlan extracts urls and creates default steps", () => {
  const plan = buildDraftBrowsePlan(
    "Create a walkthrough for https://github.com/bytedance/deer-flow and https://github.com/NousResearch/hermes-agent",
  );

  assert.deepEqual(plan.urls, [
    "https://github.com/bytedance/deer-flow",
    "https://github.com/NousResearch/hermes-agent",
  ]);
  assert.equal(plan.narration.length, 2);
  assert.equal(plan.steps[0].action, "navigate");
  assert.equal(plan.steps[0].url, plan.urls[0]);
  assert.ok(plan.steps.some((step) => step.action === "click" && step.targetKind === "link"));
  assert.ok(plan.steps.some((step) => step.action === "click" && step.targetKind === "video"));
  assert.ok(
    plan.steps.some(
      (step) => step.action === "hover" && typeof step.circleCount === "number" && step.circleCount >= 1,
    ),
  );
  assert.ok(
    plan.steps.some(
      (step) => step.action === "scroll" && step.smooth === true && (step.durationMs ?? 0) > 1000,
    ),
  );
});

test("buildNarrationBeats creates deterministic focus cues from GitHub repo urls", () => {
  const beats = buildNarrationBeats(
    "Create a polished demo for https://github.com/bytedance/deer-flow",
    ["https://github.com/bytedance/deer-flow"],
  );

  assert.equal(beats.length, 1);
  assert.match(beats[0].line, /deer-flow/i);
  assert.equal(beats[0].focusSelectors.length >= 3, true);
  assert.ok([1, 2].includes(beats[0].circleCount));
});

test("buildScreenDemoScript turns narration beats into a simple voiceover draft", () => {
  const script = buildScreenDemoScript([
    {
      url: "https://github.com/bytedance/deer-flow",
      line: "deer-flow is the focus here.",
      focusLabel: "deer flow overview",
      focusSelectors: ["#readme h1"],
      circleCount: 2,
    },
  ]);

  assert.match(script, /deer-flow is the focus here/i);
  assert.match(script, /deer flow overview/i);
});

test("deriveClipSegments applies pre/post padding and merges nearby actions", () => {
  const moments: DemoMoment[] = [
    { timeMs: 2000, action: "click", label: "first" },
    { timeMs: 3100, action: "hover", label: "second" },
    { timeMs: 9000, action: "scroll", label: "third" },
  ];

  const clips = deriveClipSegments(moments, 12000);
  assert.equal(clips.length, 2);
  assert.deepEqual(clips[0].labels, ["first", "second"]);
  assert.equal(clips[0].startMs, 1500);
  assert.equal(clips[1].startMs, 8500);
});

test("deriveClipSegments uses full action spans when endMs is available", () => {
  const clips = deriveClipSegments(
    [
      { timeMs: 1000, endMs: 2800, action: "scroll", label: "scroll" },
    ],
    10000,
  );

  assert.equal(clips.length, 1);
  assert.equal(clips[0].startMs, 500);
  assert.equal(clips[0].endMs, 3800);
});

test("normalizeMomentsToRecordingDuration rescales action timing to the actual recording length", () => {
  const normalized = normalizeMomentsToRecordingDuration(
    [
      { timeMs: 0, endMs: 1000, action: "navigate", label: "open" },
      { timeMs: 200000, endMs: 220000, action: "scroll", label: "scroll" },
    ],
    180000,
  );

  assert.equal(normalized[0].timeMs, 0);
  assert.equal(normalized[1].timeMs, 163636);
  assert.equal(normalized[1].endMs, 180000);
});

test("deriveCameraKeyframes builds zoom targets from bounds", () => {
  const keyframes = deriveCameraKeyframes([
    {
      timeMs: 1000,
      action: "click",
      label: "cta",
      bounds: { x: 100, y: 200, width: 240, height: 80 },
    },
  ]);

  assert.equal(keyframes.length, 1);
  assert.equal(keyframes[0].label, "cta");
  assert.ok(keyframes[0].scale > 1);
});

test("buildEditConfig returns a 60fps 4x playback configuration", () => {
  const config = buildEditConfig(
    [
      { timeMs: 500, action: "click", label: "hero" },
      { timeMs: 4000, action: "scroll", label: "readme" },
    ],
    8000,
    "light",
  );

  assert.equal(config.fps, 60);
  assert.equal(config.playbackRate, 4);
  assert.equal(config.backgroundMode, "light");
});
