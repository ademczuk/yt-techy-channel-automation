import test from "node:test";
import assert from "node:assert/strict";

import { detectMostlyBlackVideo } from "../src/lib/video-validation";

test("detectMostlyBlackVideo flags videos that are entirely black", () => {
  const stderr = `
[blackdetect @ 000001] black_start:0 black_end:7.26 black_duration:7.26
frame=  120 fps=0.0 q=-0.0 Lsize=N/A time=00:00:07.26 bitrate=N/A speed=6.4x
  `;

  assert.equal(detectMostlyBlackVideo(stderr), true);
});

test("detectMostlyBlackVideo ignores outputs without full black intervals", () => {
  const stderr = `
frame=  120 fps=0.0 q=-0.0 Lsize=N/A time=00:00:07.26 bitrate=N/A speed=6.4x
  `;

  assert.equal(detectMostlyBlackVideo(stderr), false);
});
