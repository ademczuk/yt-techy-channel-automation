import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCameraWindows,
  buildScreenDemoTimeline,
  calculateScreenDemoDurationInFrames,
  resolveCameraTransform,
} from "../src/lib/screen-demo-remotion";

test("buildScreenDemoTimeline rebases trimmed clips into a contiguous final timeline", () => {
  const timeline = buildScreenDemoTimeline(
    [
      { startMs: 0, endMs: 5000, labels: ["first"] },
      { startMs: 105000, endMs: 106000, labels: ["second"] },
    ],
    60,
    4,
  );

  assert.equal(timeline.length, 2);
  assert.equal(timeline[0].fromFrame, 0);
  assert.equal(timeline[0].sourceStartFrame, 0);
  assert.equal(timeline[0].durationInFrames, 75);
  assert.equal(timeline[1].fromFrame, 75);
  assert.equal(timeline[1].sourceStartFrame, 6300);
  assert.equal(timeline[1].durationInFrames, 15);
});

test("calculateScreenDemoDurationInFrames sums rebased clip durations", () => {
  const duration = calculateScreenDemoDurationInFrames(
    [
      { startMs: 0, endMs: 5000, labels: ["first"] },
      { startMs: 105000, endMs: 106000, labels: ["second"] },
    ],
    60,
    4,
  );

  assert.equal(duration, 90);
});

test("buildScreenDemoTimeline honors narration-driven clip duration and visual lead-in", () => {
  const timeline = buildScreenDemoTimeline(
    [
      { startMs: 1000, endMs: 3000, timelineDurationMs: 5000, labels: ["repo"] },
    ],
    60,
    1,
    1200,
  );

  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].fromFrame, 72);
  assert.equal(timeline[0].sourceStartFrame, 60);
  assert.equal(timeline[0].sourceDurationInFrames, 120);
  assert.equal(timeline[0].durationInFrames, 300);
});

test("buildCameraWindows creates short focus windows instead of a clip-wide zoom", () => {
  const [timelineClip] = buildScreenDemoTimeline(
    [
      { startMs: 0, endMs: 120000, labels: ["full"] },
    ],
    60,
    4,
  );

  const windows = buildCameraWindows(
    timelineClip,
    [
      { timeMs: 3000, scale: 2.2, centerX: 200, centerY: 150, label: "header" },
      { timeMs: 60000, scale: 1.6, centerX: 900, centerY: 700, label: "readme" },
    ],
    60,
    4,
  );

  assert.equal(windows.length, 2);
  assert.ok(windows[0].endFrame < timelineClip.durationInFrames / 3);
  assert.ok(windows[1].startFrame > windows[0].endFrame);
});

test("resolveCameraTransform returns to full-frame between selective zoom windows", () => {
  const [timelineClip] = buildScreenDemoTimeline(
    [
      { startMs: 0, endMs: 120000, labels: ["full"] },
    ],
    60,
    4,
  );

  const windows = buildCameraWindows(
    timelineClip,
    [
      { timeMs: 3000, scale: 2.2, centerX: 200, centerY: 150, label: "header" },
      { timeMs: 60000, scale: 1.6, centerX: 900, centerY: 700, label: "readme" },
    ],
    60,
    4,
  );

  const zoomed = resolveCameraTransform(windows[0].peakStartFrame, windows, {
    width: 1920,
    height: 1080,
  });
  const inBetweenFrame = Math.floor((windows[0].endFrame + windows[1].startFrame) / 2);
  const reset = resolveCameraTransform(inBetweenFrame, windows, {
    width: 1920,
    height: 1080,
  });

  assert.ok(zoomed.scale > 1.2);
  assert.equal(reset.scale, 1);
  assert.equal(reset.offsetX, 0);
  assert.equal(reset.offsetY, 0);
});
