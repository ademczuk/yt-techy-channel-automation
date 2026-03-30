import test from "node:test";
import assert from "node:assert/strict";
import {
  ArtifactRecordSchema,
  HarnessRunSchema,
  HarnessLogRecordSchema,
  HarnessStageSchema,
  StageStatusSchema,
  createInitialHarnessRun,
  defaultStageStatuses,
} from "../src/lib/harness-types";

test("harness stage names stay stable", () => {
  assert.deepEqual(HarnessStageSchema.options, [
    "discovery",
    "research",
    "script",
    "audio",
    "recordingPlan",
    "browserDrive",
    "capture",
    "trim",
    "handoff",
    "finalAssembly",
  ]);
});

test("stage status values stay stable", () => {
  assert.deepEqual(StageStatusSchema.options, [
    "pending",
    "running",
    "passed",
    "failed",
    "blocked",
    "readyForManual",
  ]);
});

test("createInitialHarnessRun builds a valid pending run record", () => {
  const run = createInitialHarnessRun({
    id: "run-001",
    mode: "daily-discovery",
    rootDir: "C:\\YT\\Code Search\\clawhub-weekly-master",
    runDir: "C:\\YT\\Code Search\\clawhub-weekly-master\\runtime\\runs\\run-001",
    nowIso: "2026-03-29T20:00:00.000Z",
  });

  const parsed = HarnessRunSchema.parse(run);
  assert.equal(parsed.id, "run-001");
  assert.equal(parsed.mode, "daily-discovery");
  assert.equal(parsed.status, "pending");
  assert.equal(parsed.stages.length, HarnessStageSchema.options.length);
  assert.ok(parsed.stages.every((stage) => stage.status === "pending"));
  assert.deepEqual(parsed.log, []);
});

test("defaultStageStatuses covers each known stage exactly once", () => {
  const statuses = defaultStageStatuses();

  assert.equal(statuses.length, HarnessStageSchema.options.length);
  assert.deepEqual(
    statuses.map((entry) => entry.stage),
    HarnessStageSchema.options,
  );
});

test("artifact manifest records validate", () => {
  const artifact = ArtifactRecordSchema.parse({
    id: "script-markdown",
    stage: "script",
    kind: "document",
    label: "Script Markdown",
    path: "C:\\YT\\Code Search\\clawhub-weekly-master\\runtime\\runs\\run-001\\script.md",
    relativePath: "script.md",
    createdAt: "2026-03-29T20:00:00.000Z",
  });

  assert.equal(artifact.kind, "document");
  assert.equal(artifact.stage, "script");
});

test("run log records validate", () => {
  const entry = HarnessLogRecordSchema.parse({
    time: "2026-03-29T20:05:00.000Z",
    level: "info",
    message: "Discovery shortlisted 3 repos",
    stage: "discovery",
  });

  assert.equal(entry.level, "info");
  assert.equal(entry.stage, "discovery");
});
