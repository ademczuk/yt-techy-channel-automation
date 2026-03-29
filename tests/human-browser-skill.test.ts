import test from "node:test";
import assert from "node:assert/strict";
import { buildHumanBrowserPlan } from "../src/lib/human-browser-skill";

test("buildHumanBrowserPlan creates stable durations", () => {
  const plan = buildHumanBrowserPlan(
    [
      "https://github.com/bytedance/deer-flow",
      "https://github.com/NousResearch/hermes-agent",
    ],
    10,
    900,
  );

  assert.equal(plan.perRepoDurationMs, 10_000);
  assert.equal(plan.betweenReposMs, 900);
  assert.equal(plan.repoUrls.length, 2);
});

test("buildHumanBrowserPlan enforces sane minimums", () => {
  const plan = buildHumanBrowserPlan(["https://github.com/browser-use/browser-use"], 0, -50);

  assert.equal(plan.perRepoDurationMs, 5_000);
  assert.equal(plan.betweenReposMs, 0);
});

