import test from "node:test";
import assert from "node:assert/strict";
import {
  extractGitHubRepo,
  summarizeReadme,
} from "../src/lib/readme-enrichment";
import type { CandidateTool } from "../src/lib/candidate-types";
import { rankCandidates } from "../src/lib/ranker";

test("extracts owner and repo from github urls", () => {
  const result = extractGitHubRepo("https://github.com/NousResearch/hermes-agent");

  assert.deepEqual(result, {
    owner: "NousResearch",
    repo: "hermes-agent",
  });
});

test("summarizes readme by skipping badges and choosing descriptive text", () => {
  const markdown = `
# Hermes Agent
[![Docs](https://example.com/badge.svg)](https://example.com)

**The self-improving AI agent built by Nous Research.** It's the only agent with a built-in learning loop and persistent memory across sessions.
`;

  const summary = summarizeReadme(markdown);

  assert.equal(
    summary,
    "The self-improving AI agent built by Nous Research. It's the only agent with a built-in learning loop and persistent memory across sessions.",
  );
});

test("prefers product descriptions over release announcements and thank-you notes", () => {
  const markdown = `
# DeerFlow

On February 28th, 2026, DeerFlow claimed the #1 spot on GitHub Trending following the launch of version 2. Thanks a million to our incredible community.

DeerFlow is a community-driven deep research framework built for exploring topics with autonomous agents and structured workflows.
`;

  const summary = summarizeReadme(markdown);

  assert.equal(
    summary,
    "DeerFlow is a community-driven deep research framework built for exploring topics with autonomous agents and structured workflows.",
  );
});

test("prefers product descriptions over setup prompts and cloud upsells", () => {
  const markdown = `
# browser-use

Want to skip the setup? Use our cloud for faster, scalable, stealth-enabled browser automation.

browser-use makes websites accessible for AI agents so they can navigate, extract data, and complete browser workflows.
`;

  const summary = summarizeReadme(markdown);

  assert.equal(
    summary,
    "browser-use makes websites accessible for AI agents so they can navigate, extract data, and complete browser workflows.",
  );
});

test("avoids complaint or legal-status lines when a product description exists later", () => {
  const markdown = `
# TradingAgents-CN

We noticed that another website used our proprietary code without authorization and claimed it as their product.

TradingAgents-CN is a Chinese-language adaptation of a multi-agent financial trading framework for research and experimentation.
`;

  const summary = summarizeReadme(markdown);

  assert.equal(
    summary,
    "TradingAgents-CN is a Chinese-language adaptation of a multi-agent financial trading framework for research and experimentation.",
  );
});

test("prefers descriptive headings over community announcements in framework repos", () => {
  const markdown = `
# TradingAgents: Multi-Agents LLM Financial Trading Framework

## News
- TradingAgents v0.2.2 released with new model coverage.

So we decided to fully open-source the framework. Looking forward to building impactful projects with you!

TradingAgents is a multi-agent trading framework that mirrors the dynamics of real-world trading firms.
`;

  const summary = summarizeReadme(markdown);

  assert.equal(
    summary,
    "TradingAgents: Multi-Agents LLM Financial Trading Framework",
  );
});

test("prefers a product sentence over numbered quickstart steps", () => {
  const markdown = `
Want to skip the setup? Use our cloud for faster browser automation!

# LLM Quickstart

1. Direct your favorite coding agent to Agents.md

Fast, persistent browser automation from the command line.
`;

  const summary = summarizeReadme(markdown);

  assert.equal(
    summary,
    "Fast, persistent browser automation from the command line.",
  );
});

test("prefers the leading repo description over later database maintenance notes", () => {
  const markdown = `
# IPTV

Collection of publicly available IPTV (Internet Protocol television) channels from all over the world.

All channel data is taken from the iptv-org/database repository. If you find any errors please open a new issue there.
`;

  const summary = summarizeReadme(markdown);

  assert.equal(
    summary,
    "Collection of publicly available IPTV (Internet Protocol television) channels from all over the world.",
  );
});

test("readme summary can upgrade a vague candidate into a core fit", () => {
  const candidates: CandidateTool[] = [
    {
      slug: "NousResearch/hermes-agent",
      name: "hermes-agent",
      source: "github-trending",
      url: "https://github.com/NousResearch/hermes-agent",
      description: "The agent that grows with you",
      readmeSummary:
        "The self-improving AI agent with persistent memory, scheduled automations, and subagents.",
      starsToday: 900,
      collectedAt: "2026-03-24T00:00:00.000Z",
    },
  ];

  const ranked = rankCandidates(candidates, 10);

  assert.equal(ranked[0]?.fitBucket, "core");
});
