import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildRecordlyCaptureDefaults,
  buildRecordlyProjectData,
  cuesToRecordlyZoomRegions,
  writeRecordlyProjectFile,
} from "../src/lib/recordly-project";

test("cuesToRecordlyZoomRegions converts focus cues into stable zoom windows", () => {
  const regions = cuesToRecordlyZoomRegions(
    [
      {
        label: "repo-description",
        selector: "p",
        timestampMs: 8_000,
        normalizedX: 0.38,
        normalizedY: 0.26,
      },
      {
        label: "code-sample",
        selector: "pre",
        timestampMs: 19_500,
        normalizedX: 0.62,
        normalizedY: 0.58,
      },
    ],
    32_000,
  );

  assert.equal(regions.length, 2);
  assert.deepEqual(
    regions.map((region) => region.id),
    ["zoom-1", "zoom-2"],
  );
  assert.equal(regions[0]?.startMs, 7200);
  assert.equal(regions[0]?.endMs, 10400);
  assert.equal(regions[0]?.depth, 3);
  assert.equal(regions[0]?.focus.cx, 0.38);
  assert.equal(regions[0]?.focus.cy, 0.26);
  assert.equal(regions[1]?.startMs, 18700);
  assert.equal(regions[1]?.endMs, 21900);
});

test("buildRecordlyProjectData applies sane editor defaults for Code Search walkthroughs", () => {
  const project = buildRecordlyProjectData({
    videoPath: "C:/captures/deer-flow.mp4",
    durationMs: 42_000,
    cues: [
      {
        label: "repo-title",
        selector: "a",
        timestampMs: 4_000,
        normalizedX: 0.21,
        normalizedY: 0.14,
      },
    ],
  });

  assert.equal(project.version, 1);
  assert.equal(project.videoPath, "C:/captures/deer-flow.mp4");
  assert.equal(project.editor.showCursor, true);
  assert.equal(project.editor.cursorStyle, "tahoe");
  assert.equal(project.editor.cursorSmoothing, 0.52);
  assert.equal(project.editor.cursorMotionBlur, 0.16);
  assert.equal(project.editor.cursorClickBounce, 1.2);
  assert.equal(project.editor.cursorSway, 0.08);
  assert.equal(project.editor.aspectRatio, "16:9");
  assert.equal(project.editor.exportFormat, "mp4");
  assert.equal(project.editor.exportQuality, "good");
  assert.equal(project.editor.webcam?.enabled, false);
  assert.equal(project.editor.zoomRegions?.length, 1);
});

test("buildRecordlyCaptureDefaults enforces no camera, no microphone, and no countdown", () => {
  const defaults = buildRecordlyCaptureDefaults();

  assert.deepEqual(defaults, {
    webcamEnabled: false,
    microphoneEnabled: false,
    systemAudioEnabled: false,
    countdownDelay: 0,
  });
});

test("writeRecordlyProjectFile writes a deterministic .recordly file next to the captured video", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "recordly-project-test-"));
  const videoPath = path.join(tempDir, "browser-use.mp4");
  fs.writeFileSync(videoPath, "fake-video");

  const written = await writeRecordlyProjectFile({
    videoPath,
    durationMs: 15_000,
    cues: [],
    outputDir: tempDir,
  });

  assert.equal(path.basename(written.projectPath), "browser-use.recordly");
  assert.equal(written.project.videoPath, videoPath);
  assert.ok(fs.existsSync(written.projectPath));

  const parsed = JSON.parse(fs.readFileSync(written.projectPath, "utf8")) as {
    videoPath: string;
    editor: { showCursor: boolean };
  };
  assert.equal(parsed.videoPath, videoPath);
  assert.equal(parsed.editor.showCursor, true);
});
