import test from "node:test";
import assert from "node:assert/strict";
import { getEpisodeDir, getLocalDateStamp } from "../src/lib/episode-paths";

test("formats episode dates in America/New_York", () => {
  const result = getLocalDateStamp(new Date("2026-03-24T04:00:00.000Z"));
  assert.equal(result, "2026-03-24");
});

test("builds episode directory paths", () => {
  const result = getEpisodeDir("C:/repo", "2026-03-24");
  assert.equal(result.replace(/\\/g, "/"), "C:/repo/runtime/episodes/2026-03-24");
});
