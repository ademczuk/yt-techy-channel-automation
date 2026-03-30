import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLiveExecutionPlan,
  buildTabStripChromePoint,
  slugFromRepoUrl,
  titleFragmentFromRepoUrl,
} from "../src/lib/live-playwright-walkthrough";

test("slugFromRepoUrl produces stable repo slugs", () => {
  assert.equal(slugFromRepoUrl("https://github.com/bytedance/deer-flow"), "bytedance-deer-flow");
  assert.equal(slugFromRepoUrl("https://github.com/NousResearch/hermes-agent/"), "NousResearch-hermes-agent");
});

test("titleFragmentFromRepoUrl uses repo name", () => {
  assert.equal(titleFragmentFromRepoUrl("https://github.com/browser-use/browser-use"), "browser-use");
});

test("buildLiveExecutionPlan preserves tab order and repo beat plans from the recording plan", () => {
  const plan = buildLiveExecutionPlan({
    generatedAt: "2026-03-30T02:00:00.000Z",
    repoUrls: [
      "https://github.com/bytedance/deer-flow",
      "https://github.com/browser-use/browser-use",
    ],
    capturePrompt: "demo",
    viewport: { width: 1920, height: 1080 },
    audioDurationMs: 9000,
    introLeadInMs: 1600,
    tabs: [
      {
        repoUrl: "https://github.com/bytedance/deer-flow",
        slug: "bytedance/deer-flow",
        titleFragment: "deer-flow",
        tabIndex: 0,
      },
      {
        repoUrl: "https://github.com/browser-use/browser-use",
        slug: "browser-use/browser-use",
        titleFragment: "browser-use",
        tabIndex: 1,
      },
    ],
    repos: [
      {
        repoUrl: "https://github.com/bytedance/deer-flow",
        slug: "bytedance/deer-flow",
        name: "deer-flow",
        tabIndex: 0,
        narration: "deer-flow narration",
        segmentDurationMs: 4200,
        visualProof: ["README overview"],
        beats: [
          {
            id: "beat-1",
            label: "Focus README heading",
            action: "focus-heading",
            durationMs: 1000,
            allowedZone: "page",
            selectorCandidates: ["#readme h1"],
          },
        ],
      },
      {
        repoUrl: "https://github.com/browser-use/browser-use",
        slug: "browser-use/browser-use",
        name: "browser-use",
        tabIndex: 1,
        narration: "browser-use narration",
        segmentDurationMs: 4800,
        visualProof: ["feature list"],
        beats: [
          {
            id: "beat-2",
            label: "Smooth scroll through the README",
            action: "smooth-scroll",
            durationMs: 1200,
            allowedZone: "page",
            selectorCandidates: ["#readme article"],
            deltaY: 420,
          },
        ],
      },
    ],
  });

  assert.equal(plan.tabs.length, 2);
  assert.deepEqual(plan.tabs.map((tab) => tab.tabIndex), [0, 1]);
  assert.equal(plan.repoExecutions[0]?.repoUrl, "https://github.com/bytedance/deer-flow");
  assert.equal(plan.repoExecutions[1]?.beats[0]?.action, "smooth-scroll");
});

test("buildTabStripChromePoint stays inside the browser chrome and advances per tab", () => {
  const first = buildTabStripChromePoint(
    {
      screenX: 0,
      screenY: 0,
      outerWidth: 1920,
      outerHeight: 1040,
      innerWidth: 1904,
      innerHeight: 952,
    },
    0,
    3,
  );
  const second = buildTabStripChromePoint(
    {
      screenX: 0,
      screenY: 0,
      outerWidth: 1920,
      outerHeight: 1040,
      innerWidth: 1904,
      innerHeight: 952,
    },
    1,
    3,
  );

  assert.ok(first);
  assert.ok(second);
  assert.equal((second?.x ?? 0) > (first?.x ?? 0), true);
  assert.equal((first?.y ?? 0) < 88, true);
});
