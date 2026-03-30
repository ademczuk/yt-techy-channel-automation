import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  appendHarnessLog,
  createHarnessRunStorage,
  listHarnessArtifacts,
  readHarnessRun,
  setHarnessStageStatus,
} from "../src/lib/harness-storage";

test("createHarnessRunStorage creates a dedicated run directory with run.json", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-storage-"));

  const created = createHarnessRunStorage({
    rootDir,
    mode: "daily-discovery",
    id: "run-storage-001",
    now: new Date("2026-03-29T20:30:00.000Z"),
  });

  assert.ok(fs.existsSync(created.runDir));
  assert.ok(fs.existsSync(created.runPath));

  const loaded = readHarnessRun(created.runPath);
  assert.equal(loaded.id, "run-storage-001");
  assert.equal(loaded.mode, "daily-discovery");
});

test("setHarnessStageStatus persists stage updates back to disk", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-stage-"));
  const created = createHarnessRunStorage({
    rootDir,
    mode: "manual-urls",
    id: "run-stage-001",
    now: new Date("2026-03-29T20:45:00.000Z"),
  });

  const updated = setHarnessStageStatus(created.runDir, "discovery", {
    status: "running",
    summary: "Fetching GitHub candidates",
    startedAt: "2026-03-29T20:46:00.000Z",
  });

  assert.equal(updated.stages.find((stage) => stage.stage === "discovery")?.status, "running");

  const reloaded = readHarnessRun(created.runPath);
  assert.equal(reloaded.stages.find((stage) => stage.stage === "discovery")?.summary, "Fetching GitHub candidates");
  assert.equal(reloaded.updatedAt, updated.updatedAt);
});

test("listHarnessArtifacts returns user-facing files beneath the run directory", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-artifacts-"));
  const created = createHarnessRunStorage({
    rootDir,
    mode: "daily-discovery",
    id: "run-artifacts-001",
    now: new Date("2026-03-29T21:00:00.000Z"),
  });

  const nestedDir = path.join(created.runDir, "outputs");
  fs.mkdirSync(nestedDir, { recursive: true });
  fs.writeFileSync(path.join(created.runDir, "script.md"), "# Script\n", "utf8");
  fs.writeFileSync(path.join(nestedDir, "audio-manifest.json"), "{}\n", "utf8");

  const artifacts = listHarnessArtifacts(created.runDir);

  assert.deepEqual(
    artifacts.map((artifact) => artifact.relativePath),
    ["outputs/audio-manifest.json", "script.md"],
  );
});

test("appendHarnessLog persists disk-backed run events", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-log-"));
  const created = createHarnessRunStorage({
    rootDir,
    mode: "daily-discovery",
    id: "run-log-001",
    now: new Date("2026-03-29T21:05:00.000Z"),
  });

  const updated = appendHarnessLog(created.runDir, {
    time: "2026-03-29T21:06:00.000Z",
    level: "info",
    stage: "research",
    message: "Research brief written",
  });

  assert.equal(updated.log.length, 1);
  assert.equal(updated.log[0]?.stage, "research");

  const reloaded = readHarnessRun(created.runPath);
  assert.equal(reloaded.log[0]?.message, "Research brief written");
});
