import test from "node:test";
import assert from "node:assert/strict";
import type { CandidateTool } from "../src/lib/candidate-types";
import { selectEditorialSummary } from "../src/lib/editorial-copy";

test("prefers readme summaries when they are stronger than the raw description", () => {
  const candidate: CandidateTool = {
    slug: "NousResearch/hermes-agent",
    name: "hermes-agent",
    source: "github-trending",
    url: "https://github.com/NousResearch/hermes-agent",
    description: "The agent that grows with you",
    readmeSummary:
      "The self-improving AI agent built by Nous Research with a built-in learning loop and persistent memory across sessions.",
    collectedAt: "2026-03-24T00:00:00.000Z",
  };

  assert.equal(
    selectEditorialSummary(candidate),
    "The self-improving AI agent built by Nous Research with a built-in learning loop and persistent memory across sessions.",
  );
});

test("falls back to the repo description when readme enrichment grabs config or setup text", () => {
  const candidate: CandidateTool = {
    slug: "bytedance/deer-flow",
    name: "deer-flow",
    source: "github-trending",
    url: "https://github.com/bytedance/deer-flow",
    description:
      "An open-source SuperAgent harness that researches, codes, and creates with sandboxes, memory, tools, skills, and subagents.",
    readmeSummary: "LangGraph Server URL (default:",
    collectedAt: "2026-03-24T00:00:00.000Z",
  };

  assert.equal(
    selectEditorialSummary(candidate),
    "An open-source SuperAgent harness that researches, codes, and creates with sandboxes, memory, tools, skills, and subagents.",
  );
});

test("falls back to the repo description when readme enrichment grabs benchmark or docs copy", () => {
  const candidate: CandidateTool = {
    slug: "browser-use/browser-use",
    name: "browser-use",
    source: "github-trending",
    url: "https://github.com/browser-use/browser-use",
    description: "Make websites accessible for AI agents. Automate tasks online with ease.",
    readmeSummary:
      "We benchmark Browser Use across 100 real-world browser tasks. Full benchmark is open source.",
    collectedAt: "2026-03-24T00:00:00.000Z",
  };

  assert.equal(
    selectEditorialSummary(candidate),
    "Make websites accessible for AI agents. Automate tasks online with ease.",
  );
});

test("falls back to the repo description when readme enrichment grabs a niche internal detail", () => {
  const candidate: CandidateTool = {
    slug: "jingyaogong/minimind",
    name: "minimind",
    source: "github-trending",
    url: "https://github.com/jingyaogong/minimind",
    description: "Train a 26M-parameter GPT from scratch in just 2 hours.",
    readmeSummary:
      "Environment-based奖励：在Agent场景中，环境反馈本身即为天然奖励。",
    collectedAt: "2026-03-24T00:00:00.000Z",
  };

  assert.equal(
    selectEditorialSummary(candidate),
    "Train a 26M-parameter GPT from scratch in just 2 hours.",
  );
});
