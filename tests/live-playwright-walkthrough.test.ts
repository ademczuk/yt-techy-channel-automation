import test from "node:test";
import assert from "node:assert/strict";
import { buildLiveRepoSteps, slugFromRepoUrl, titleFragmentFromRepoUrl } from "../src/lib/live-playwright-walkthrough";

test("slugFromRepoUrl produces stable repo slugs", () => {
  assert.equal(slugFromRepoUrl("https://github.com/bytedance/deer-flow"), "bytedance-deer-flow");
  assert.equal(slugFromRepoUrl("https://github.com/NousResearch/hermes-agent/"), "NousResearch-hermes-agent");
});

test("titleFragmentFromRepoUrl uses repo name", () => {
  assert.equal(titleFragmentFromRepoUrl("https://github.com/browser-use/browser-use"), "browser-use");
});

test("buildLiveRepoSteps assigns deterministic tab order and motions", () => {
  const steps = buildLiveRepoSteps([
    "https://github.com/bytedance/deer-flow",
    "https://github.com/NousResearch/hermes-agent",
    "https://github.com/browser-use/browser-use",
  ]);

  assert.equal(steps.length, 3);
  assert.deepEqual(
    steps.map((step) => step.tabIndex),
    [0, 1, 2],
  );
  assert.deepEqual(steps[0]?.scrollSequence, [420, 360, 300, -180]);
  assert.equal(steps[1]?.expectedTitleFragment, "hermes-agent");
  assert.equal(steps[2]?.slug, "browser-use-browser-use");
});

