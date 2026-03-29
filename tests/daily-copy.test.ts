import test from "node:test";
import assert from "node:assert/strict";
import type { CandidateTool } from "../src/lib/candidate-types";
import {
  buildDailyToolScript,
  isDailyEnglishReady,
  selectDailySummary,
} from "../src/lib/daily-copy";

test("falls back to the english description when readme summary is mostly non-english", () => {
  const candidate: CandidateTool = {
    slug: "jingyaogong/minimind",
    name: "minimind",
    source: "github-trending",
    url: "https://github.com/jingyaogong/minimind",
    description: "Train a 26M-parameter GPT from scratch in just 2 hours.",
    readmeSummary:
      "环境反馈本身即为天然奖励，适用于Agent场景中的任务完成度评估。",
    collectedAt: "2026-03-24T00:00:00.000Z",
  };

  assert.equal(
    selectDailySummary(candidate),
    "Train a 26M-parameter GPT from scratch in just 2 hours.",
  );
});

test("prefers richer english readme copy over a generic tagline", () => {
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
    selectDailySummary(candidate),
    "The self-improving AI agent built by Nous Research with a built-in learning loop and persistent memory across sessions.",
  );
});

test("daily tool scripts are conversational and do not use the old generic outro line", () => {
  const candidate: CandidateTool = {
    slug: "browser-use/browser-use",
    name: "browser-use",
    source: "github-trending",
    url: "https://github.com/browser-use/browser-use",
    description: "Make websites accessible for AI agents. Automate tasks online with ease.",
    collectedAt: "2026-03-24T00:00:00.000Z",
  };

  const script = buildDailyToolScript(candidate, 1);

  assert.match(script, /browser-use/i);
  assert.doesNotMatch(script, /keep an eye on this one/i);
  assert.doesNotMatch(script, /tracking developer tools and automation workflows/i);
  assert.doesNotMatch(script, /first up is|next on the list is/i);
});

test("daily tool scripts can open with the repo name directly", () => {
  const candidate: CandidateTool = {
    slug: "bytedance/deer-flow",
    name: "deer-flow",
    source: "github-trending",
    url: "https://github.com/bytedance/deer-flow",
    description: "An open-source SuperAgent harness that researches, codes, and creates.",
    collectedAt: "2026-03-24T00:00:00.000Z",
  };

  const script = buildDailyToolScript(candidate, 1);
  assert.match(script, /^deer-flow\b/i);
});

test("flags fully non-english items as not daily-ready", () => {
  const candidate: CandidateTool = {
    slug: "hsliuping/TradingAgents-CN",
    name: "TradingAgents-CN",
    source: "github-trending",
    url: "https://github.com/hsliuping/TradingAgents-CN",
    description: "基于多智能体LLM的中文金融交易框架 - TradingAgents中文增强版",
    readmeSummary:
      "面向中文用户的多智能体与大模型股票分析学习平台，帮助你系统化学习研究。",
    collectedAt: "2026-03-24T00:00:00.000Z",
  };

  assert.equal(isDailyEnglishReady(candidate), false);
});
