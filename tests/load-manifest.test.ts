import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { loadEpisodeManifest } from "../src/lib/load-manifest";
import { DEFAULT_EPISODE_DATA } from "../src/lib/default-episode";

test("falls back to default episode data when manifest does not exist", () => {
  const missingPath = path.join(os.tmpdir(), `missing-${Date.now()}.json`);
  const result = loadEpisodeManifest(missingPath);

  assert.equal(result.episodeNumber, DEFAULT_EPISODE_DATA.episodeNumber);
  assert.equal(result.movers[0]?.displayName, DEFAULT_EPISODE_DATA.movers[0]?.displayName);
});

test("loads and validates a generated manifest when present", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
  const manifestPath = path.join(tempDir, "manifest.json");
  const manifest = {
    ...DEFAULT_EPISODE_DATA,
    episodeNumber: 99,
    weekLabel: "Week of Mar 23, 2026",
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  const result = loadEpisodeManifest(manifestPath);

  assert.equal(result.episodeNumber, 99);
  assert.equal(result.weekLabel, "Week of Mar 23, 2026");
});
