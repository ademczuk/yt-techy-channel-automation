import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { runHarnessRecordingPlanStage } from "../src/lib/harness-recording-plan";

test("runHarnessRecordingPlanStage writes narration-aware repo beats from script and audio artifacts", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-recording-plan-"));
  const runDir = path.join(rootDir, "runtime", "runs", "2026-03-29", "run-recording-plan-001");
  fs.mkdirSync(runDir, { recursive: true });

  fs.writeFileSync(path.join(runDir, "script-packet.json"), `${JSON.stringify({
    episodeTitle: "Code Search Daily",
    intro: {
      narration: "Intro",
    },
    repos: [
      {
        slug: "bytedance/deer-flow",
        name: "deer-flow",
        url: "https://github.com/bytedance/deer-flow",
        narration: "deer-flow organizes planning and execution in a structured workflow.",
        visualProof: ["Repository header", "Workflow or architecture section"],
      },
    ],
  }, null, 2)}\n`, "utf8");

  fs.writeFileSync(path.join(runDir, "audio-manifest.json"), `${JSON.stringify({
    totalDurationMs: 4321,
    voice: {
      provider: "openai",
      voiceId: "shimmer",
      voiceLabel: "Shimmer",
    },
    segments: [
      { id: "intro", label: "Intro", path: "audio/intro.mp3", durationMs: 1000, segmentType: "intro" },
      { id: "repo-bytedance-deer-flow", label: "deer-flow", path: "audio/bytedance-deer-flow.mp3", durationMs: 3321, segmentType: "repo", repoSlug: "bytedance/deer-flow" },
    ],
  }, null, 2)}\n`, "utf8");

  const result = await runHarnessRecordingPlanStage({
    runDir,
  });

  assert.equal(result.plan.tabs.length, 1);
  assert.equal(result.plan.tabs[0]?.repoUrl, "https://github.com/bytedance/deer-flow");
  assert.equal(result.plan.repos.length, 1);
  assert.equal(result.plan.repos[0]?.segmentDurationMs, 3321);
  assert.ok((result.plan.repos[0]?.beats.length ?? 0) >= 4);
  assert.equal(result.plan.repos[0]?.beats.some((beat) => beat.action === "smooth-scroll"), true);
  assert.equal(result.plan.repos[0]?.beats.some((beat) => beat.action === "click-link"), true);
  assert.equal(result.plan.repos[0]?.beats.some((beat) => /repo title/i.test(beat.label)), false);
  assert.match(result.plan.capturePrompt, /real mouse movement/i);
  assert.ok(fs.existsSync(result.planPath));
});
