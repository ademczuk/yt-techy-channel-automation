import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  buildWebreelProofConfig,
  inferWebreelFailureStage,
  listWebreelArtifacts,
  toRuntimeAssetPath,
} from "../src/lib/webreel-debug";

test("buildWebreelProofConfig creates two deterministic videos", () => {
  const config = buildWebreelProofConfig({
    outDir: "C:\\YT\\webreel-runtime\\2026-03-26\\proof",
    cursorAssetPath: "./windows-cursor.svg",
    repos: [
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
    ],
  });

  assert.equal(config.outDir, "C:/YT/webreel-runtime/2026-03-26/proof");
  assert.deepEqual(Object.keys(config.videos), [
    "bytedance-deer-flow",
    "nousresearch-hermes-agent",
  ]);
  assert.equal(config.videos["bytedance-deer-flow"].output, "bytedance-deer-flow.mp4");
  assert.equal(config.videos["nousresearch-hermes-agent"].output, "nousresearch-hermes-agent.mp4");
  assert.ok(config.videos["bytedance-deer-flow"].steps.every((step) => [
    "wait",
    "moveTo",
    "hover",
    "scroll",
    "pause",
  ].includes(step.action)));
});

test("inferWebreelFailureStage recognizes record-stage failure from timeline-only output", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "webreel-debug-"));
  const configDir = path.join(tempRoot, "config");
  const timelineDir = path.join(configDir, ".webreel", "timelines");
  fs.mkdirSync(timelineDir, { recursive: true });
  fs.writeFileSync(path.join(timelineDir, "demo.timeline.json"), "{}");

  const report = listWebreelArtifacts(configDir, tempRoot);
  assert.equal(inferWebreelFailureStage(report), "record_demo");
});

test("inferWebreelFailureStage recognizes composite-stage failure from raw files without mp4", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "webreel-debug-"));
  const configDir = path.join(tempRoot, "config");
  const rawDir = path.join(configDir, ".webreel", "raw");
  fs.mkdirSync(rawDir, { recursive: true });
  fs.writeFileSync(path.join(rawDir, "demo.webm"), "raw");

  const report = listWebreelArtifacts(configDir, tempRoot);
  assert.equal(inferWebreelFailureStage(report), "composite_demo");
});

test("toRuntimeAssetPath normalizes runtime-relative asset paths", () => {
  assert.equal(
    toRuntimeAssetPath("C:\\YT\\Code Search\\clawhub-weekly-master\\runtime\\tests\\2026-03-26\\webreel\\demo.mp4"),
    "runtime/tests/2026-03-26/webreel/demo.mp4",
  );
});
