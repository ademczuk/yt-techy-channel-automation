import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createFallbackSynthesizeAudio,
  isElevenLabsQuotaExceededError,
  runHarnessAudioStage,
} from "../src/lib/harness-audio";

test("runHarnessAudioStage writes audio artifacts and a manifest from the script packet", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-audio-"));
  const runDir = path.join(rootDir, "runtime", "runs", "2026-03-29", "run-audio-001");
  fs.mkdirSync(runDir, { recursive: true });

  fs.writeFileSync(path.join(runDir, "script-packet.json"), `${JSON.stringify({
    episodeTitle: "Code Search Daily",
    intro: {
      narration: "Here is the first repo to watch today.",
    },
    repos: [
      {
        slug: "bytedance/deer-flow",
        name: "deer-flow",
        url: "https://github.com/bytedance/deer-flow",
        narration: "deer-flow organizes planning and execution in a structured workflow.",
      },
    ],
  }, null, 2)}\n`, "utf8");

  const result = await runHarnessAudioStage({
    runDir,
    synthesizeAudio: async ({ outputPath }) => {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, "fake-audio", "utf8");
      return 1234;
    },
  });

  assert.equal(result.manifest.segments.length, 2);
  assert.equal(result.manifest.totalDurationMs, 2468);
  assert.equal(result.manifest.voice.provider, "custom");
  assert.equal(result.manifest.voice.voiceId, "custom");
  assert.equal(result.manifest.segments[0]?.segmentType, "intro");
  assert.equal(result.manifest.segments[1]?.segmentType, "repo");
  assert.equal(result.manifest.segments[1]?.repoSlug, "bytedance/deer-flow");
  assert.ok(fs.existsSync(result.manifestPath));
  assert.ok(fs.existsSync(path.join(runDir, "audio", "intro.mp3")));
});

test("createFallbackSynthesizeAudio retries with fallback when ElevenLabs quota is exceeded", async () => {
  const calls: string[] = [];
  const synthesize = createFallbackSynthesizeAudio({
    primary: async () => {
      calls.push("primary");
      throw new Error("ElevenLabs request failed: 401 {\"detail\":{\"status\":\"quota_exceeded\"}}");
    },
    fallback: async ({ outputPath }) => {
      calls.push("fallback");
      fs.writeFileSync(outputPath, "fallback-audio", "utf8");
      return 777;
    },
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-audio-fallback-"));
  const outputPath = path.join(rootDir, "fallback.mp3");
  const duration = await synthesize({
    text: "hello",
    outputPath,
    label: "Fallback",
  });

  assert.deepEqual(calls, ["primary", "fallback"]);
  assert.equal(duration, 777);
  assert.ok(fs.existsSync(outputPath));
  assert.equal(isElevenLabsQuotaExceededError(new Error("ElevenLabs request failed: 401 {\"detail\":{\"status\":\"quota_exceeded\"}}")), true);
  assert.equal(isElevenLabsQuotaExceededError(new Error("some other error")), false);
});
