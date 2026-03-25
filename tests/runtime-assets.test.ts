import test from "node:test";
import assert from "node:assert/strict";
import { collectRuntimeAssetPaths } from "../src/lib/runtime-assets";
import type { SkillsWeeklyProps } from "../src/lib/episode-types";

test("collects runtime asset paths from an episode manifest", () => {
  const manifest = {
    episodeNumber: 1,
    weekLabel: "Daily scan",
    generatedAt: "2026-03-24T00:00:00.000Z",
    fps: 30,
    movers: [
      {
        slug: "example/tool",
        displayName: "tool",
        summary: "summary",
        author: "example",
        downloads: 0,
        stars: 0,
        installsCurrent: 0,
        installsAllTime: 0,
        clawhubUrl: "https://github.com/example/tool",
        createdAt: "2026-03-24T00:00:00.000Z",
        track: "mover" as const,
        rank: 1,
        script: "script",
        screenshotPath: "runtime/episodes/2026-03-24/screenshots/tool.png",
        audioPath: "runtime/episodes/2026-03-24/audio/tool.mp3",
      },
    ],
    rockets: [],
    introAudioPath: "runtime/episodes/2026-03-24/audio/scene-intro.mp3",
    outroAudioPath: "runtime/episodes/2026-03-24/audio/scene-outro.mp3",
  } satisfies SkillsWeeklyProps;

  assert.deepEqual(collectRuntimeAssetPaths(manifest), [
    "runtime/episodes/2026-03-24/audio/scene-intro.mp3",
    "runtime/episodes/2026-03-24/audio/scene-outro.mp3",
    "runtime/episodes/2026-03-24/screenshots/tool.png",
    "runtime/episodes/2026-03-24/audio/tool.mp3",
  ]);
});
