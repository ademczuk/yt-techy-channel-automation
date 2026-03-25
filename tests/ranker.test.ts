import test from "node:test";
import assert from "node:assert/strict";
import type { CandidateTool } from "../src/lib/candidate-types";
import { rankCandidates } from "../src/lib/ranker";

test("filters sponsor entries out of ranked candidates", () => {
  const candidates: CandidateTool[] = [
    {
      slug: "sponsors/test",
      name: "test",
      source: "github-trending",
      url: "https://github.com/sponsors/test",
      collectedAt: "2026-03-24T00:00:00.000Z",
    },
    {
      slug: "openai/codex",
      name: "codex",
      source: "github-trending",
      url: "https://github.com/openai/codex",
      description: "Automation and coding agent for developers.",
      starsToday: 2000,
      collectedAt: "2026-03-24T00:00:00.000Z",
    },
  ];

  const ranked = rankCandidates(candidates, 10);

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0]?.slug, "openai/codex");
});

test("prioritizes strong audience-fit developer tools", () => {
  const candidates: CandidateTool[] = [
    {
      slug: "example/boring",
      name: "boring",
      source: "github-trending",
      url: "https://github.com/example/boring",
      description: "miscellaneous files",
      starsToday: 1500,
      collectedAt: "2026-03-24T00:00:00.000Z",
    },
    {
      slug: "browser-use/browser-use",
      name: "browser-use",
      source: "github-trending",
      url: "https://github.com/browser-use/browser-use",
      description: "Make websites accessible for AI agents. Automate tasks online with ease.",
      starsToday: 1200,
      collectedAt: "2026-03-24T00:00:00.000Z",
    },
  ];

  const ranked = rankCandidates(candidates, 10);

  assert.equal(ranked[0]?.slug, "browser-use/browser-use");
  assert.equal(ranked[0]?.fitBucket, "core");
});

test("keeps credible adjacent software instead of auto-rejecting it", () => {
  const candidates: CandidateTool[] = [
    {
      slug: "iptv-org/iptv",
      name: "iptv",
      source: "github-trending",
      url: "https://github.com/iptv-org/iptv",
      description: "Collection of publicly available IPTV channels from all over the world",
      starsToday: 120,
      collectedAt: "2026-03-24T00:00:00.000Z",
    },
  ];

  const ranked = rankCandidates(candidates, 10);

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0]?.fitBucket, "adjacent");
});

test("penalizes duplicate family variants", () => {
  const candidates: CandidateTool[] = [
    {
      slug: "TauricResearch/TradingAgents",
      name: "TradingAgents",
      source: "github-trending",
      url: "https://github.com/TauricResearch/TradingAgents",
      description: "TradingAgents: Multi-Agents LLM Financial Trading Framework",
      starsToday: 2500,
      collectedAt: "2026-03-24T00:00:00.000Z",
    },
    {
      slug: "hsliuping/TradingAgents-CN",
      name: "TradingAgents-CN",
      source: "github-trending",
      url: "https://github.com/hsliuping/TradingAgents-CN",
      description: "Chinese-enhanced TradingAgents variant",
      starsToday: 2400,
      collectedAt: "2026-03-24T00:00:00.000Z",
    },
  ];

  const ranked = rankCandidates(candidates, 10);

  assert.equal(ranked[0]?.slug, "TauricResearch/TradingAgents");
  assert.ok((ranked[1]?.reasons ?? []).includes("duplicate-family penalty"));
});
