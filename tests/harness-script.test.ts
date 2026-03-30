import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateSpeechDurationMs,
  loadScriptAgentConfig,
  runHarnessScriptStage,
  trimNarrationToDuration,
} from "../src/lib/harness-script";

test("runHarnessScriptStage writes a deterministic script packet from research output", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-script-"));
  const runDir = path.join(rootDir, "runtime", "runs", "2026-03-29", "run-script-001");
  fs.mkdirSync(runDir, { recursive: true });

  fs.writeFileSync(path.join(runDir, "research-shortlist.json"), `${JSON.stringify([
    {
      slug: "bytedance/deer-flow",
      name: "deer-flow",
      url: "https://github.com/bytedance/deer-flow",
      score: 49.9,
      fitBucket: "core",
      summary: "deer-flow organizes planning, execution, and review into a structured multi-agent workflow.",
      reasons: ["high daily star velocity"],
      recommendedAngle: "Lead with the workflow payoff.",
      visualProof: ["Repository header", "Workflow or architecture section"],
    },
  ], null, 2)}\n`, "utf8");

  const result = await runHarnessScriptStage({
    runDir,
    titlePrefix: "Code Search",
    generateScriptPacket: async (promptPacket) => ({
      generatedAt: "2026-03-29T22:05:00.000Z",
      sop: {
        styleKey: "github-awesome-close-mimic",
        episodeMode: "demo-3-repo",
        mimicRatio: 0.92,
        houseStyleDelta: "Light flirty jokes and practical builder framing in small doses.",
        voiceDirection: "Slightly sultry, clear, and practical.",
      },
      episodeTitle: promptPacket.constraints.titlePrefix + " GitHub Project Rundown",
      intro: {
        narration: "Welcome back to Code Search. Here are the GitHub projects worth watching in this run.",
      },
      repos: promptPacket.repos.map((repo) => ({
        slug: repo.slug,
        name: repo.name,
        url: repo.url,
        summary: repo.summary,
        recommendedAngle: repo.recommendedAngle,
        visualProof: repo.visualProof,
        narration: `${repo.name} is worth watching because ${repo.summary}`,
      })),
    }),
  });

  assert.equal(result.packet.repos.length, 1);
  assert.match(result.packet.episodeTitle, /Code Search/);
  assert.match(result.packet.repos[0]?.narration ?? "", /deer-flow/i);
  assert.equal(result.packet.sop.styleKey, "github-awesome-close-mimic");
  assert.equal(result.packet.intro.narration.startsWith("Welcome back"), true);
  assert.ok(fs.existsSync(result.scriptPath));
  assert.ok(fs.existsSync(result.packetPath));
  assert.ok(fs.existsSync(result.promptPath));

  const promptPacket = JSON.parse(fs.readFileSync(result.promptPath, "utf8")) as {
    mode: string;
    repos: Array<{ slug: string }>;
    constraints: { titlePrefix: string };
    sop: { defaultEpisodeMode: string };
  };
  assert.equal(promptPacket.mode, "bounded-agent-script");
  assert.equal(promptPacket.repos[0]?.slug, "bytedance/deer-flow");
  assert.equal(promptPacket.constraints.titlePrefix, "Code Search");
  assert.equal(promptPacket.sop.defaultEpisodeMode, "demo-3-repo");
  assert.equal((promptPacket.constraints as { introMaxSeconds?: number }).introMaxSeconds, 10);
  assert.equal((promptPacket.constraints as { repoMaxSeconds?: number }).repoMaxSeconds, 30);
});

test("trimNarrationToDuration keeps demo-mode narration under the requested cap", () => {
  const source = "This is sentence one about a repo. This is sentence two explaining why it matters. This is sentence three that keeps going too long for a short demo mode segment. This is sentence four that should probably not survive if we need a tighter runtime.";
  const trimmed = trimNarrationToDuration(source, 9_000);
  assert.equal(estimateSpeechDurationMs(trimmed) <= 9_000, true);
  assert.equal(trimmed.length < source.length, true);
});

test("loadScriptAgentConfig reuses Midscene planning model settings when OpenAI env is not set", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-script-config-"));
  const runtimeDir = path.join(rootDir, "runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(path.join(runtimeDir, "midscene.env"), [
    "MIDSCENE_MODEL_API_KEY=ollama-local",
    "MIDSCENE_MODEL_BASE_URL=http://127.0.0.1:11434/v1",
    "MIDSCENE_MODEL_NAME=qwen3-vl:4b-instruct",
    "MIDSCENE_PLANNING_MODEL_API_KEY=test-openai-key",
    "MIDSCENE_PLANNING_MODEL_BASE_URL=https://api.openai.com/v1",
    "MIDSCENE_PLANNING_MODEL_NAME=gpt-5.2",
  ].join("\n"), "utf8");

  const previousCwd = process.cwd();
  const previousKey = process.env.OPENAI_API_KEY;
  const previousBaseUrl = process.env.OPENAI_BASE_URL;
  const previousModel = process.env.OPENAI_MODEL;

  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;
  process.chdir(rootDir);

  try {
    const config = loadScriptAgentConfig();
    assert.deepEqual(config, {
      apiKey: "test-openai-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-5.2",
    });
  } finally {
    process.chdir(previousCwd);
    if (previousKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousKey;
    }
    if (previousBaseUrl === undefined) {
      delete process.env.OPENAI_BASE_URL;
    } else {
      process.env.OPENAI_BASE_URL = previousBaseUrl;
    }
    if (previousModel === undefined) {
      delete process.env.OPENAI_MODEL;
    } else {
      process.env.OPENAI_MODEL = previousModel;
    }
  }
});
