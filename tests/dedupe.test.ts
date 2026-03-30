import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  canonicalSkillId,
  dedupeAndSelect,
  isEligibleForEpisode,
  loadLedger,
  recordEpisode,
  saveLedger,
  type EpisodeLedger,
} from "../src/lib/dedupe";
import type { RankedCandidate } from "../src/lib/ranker";

function makeCandidate(
  overrides: Partial<RankedCandidate> & { slug: string },
): RankedCandidate {
  return {
    name: overrides.slug,
    source: "github-trending",
    url: `https://github.com/${overrides.slug}`,
    collectedAt: "2026-03-30T00:00:00.000Z",
    score: 50,
    reasons: [],
    fitBucket: "core",
    ...overrides,
  };
}

// --- canonicalSkillId ---

test("canonicalSkillId: clawhub source uses slug", () => {
  assert.equal(
    canonicalSkillId({ slug: "memory-consolidate", source: "clawhub" }),
    "clawhub:memory-consolidate",
  );
});

test("canonicalSkillId: github URL produces gh:<owner/repo>", () => {
  assert.equal(
    canonicalSkillId({ url: "https://github.com/openai/codex" }),
    "gh:openai/codex",
  );
});

test("canonicalSkillId: fallback uses normalized name", () => {
  assert.equal(
    canonicalSkillId({ name: "My Cool Tool!" }),
    "name:my-cool-tool",
  );
});

test("canonicalSkillId: clawhub takes priority over github URL", () => {
  assert.equal(
    canonicalSkillId({
      slug: "my-skill",
      source: "clawhub",
      url: "https://github.com/user/repo",
    }),
    "clawhub:my-skill",
  );
});

// --- source merge: highest score wins ---

test("dedupeAndSelect: same GitHub repo from two scrapers keeps highest score", () => {
  const ledger: EpisodeLedger = { version: 1, entries: {} };

  // Same GitHub URL appearing from two different collection passes (both
  // resolve to "gh:openai/codex" — the higher score should win).
  const low = makeCandidate({
    slug: "openai/codex",
    source: "github-trending",
    url: "https://github.com/openai/codex",
    score: 30,
  });
  const high = makeCandidate({
    slug: "openai/codex",
    source: "github-trending",
    url: "https://github.com/openai/codex",
    score: 80,
  });

  const selected = dedupeAndSelect([low, high], ledger, 5, "2026-03-30");

  assert.equal(selected.length, 1);
  assert.equal(selected[0]?.score, 80);
});

// --- cross-episode cooldown ---

test("isEligibleForEpisode: skill featured last week is excluded", () => {
  const ledger: EpisodeLedger = { version: 1, entries: {} };
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  recordEpisode(ledger, "gh:openai/codex", "openai/codex", "codex", 1, lastWeek);

  assert.equal(isEligibleForEpisode("gh:openai/codex", ledger), false);
});

test("isEligibleForEpisode: skill featured 9 weeks ago is included (default 8-week window)", () => {
  const ledger: EpisodeLedger = { version: 1, entries: {} };
  const nineWeeksAgo = new Date(Date.now() - 9 * 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  recordEpisode(
    ledger,
    "gh:openai/codex",
    "openai/codex",
    "codex",
    1,
    nineWeeksAgo,
  );

  assert.equal(isEligibleForEpisode("gh:openai/codex", ledger), true);
});

test("dedupeAndSelect: excludes skill within cooldown window", () => {
  const ledger: EpisodeLedger = { version: 1, entries: {} };
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  recordEpisode(
    ledger,
    "gh:openai/codex",
    "openai/codex",
    "codex",
    1,
    yesterday,
  );

  const candidates = [
    makeCandidate({ slug: "openai/codex", url: "https://github.com/openai/codex" }),
  ];
  const selected = dedupeAndSelect(candidates, ledger, 5, "2026-03-30");
  assert.equal(selected.length, 0);
});

// --- ledger round-trip ---

test("ledger round-trips through save and load", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dedupe-test-"));
  const runtimeDir = path.join(tmpDir, "runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });

  const ledger: EpisodeLedger = { version: 1, entries: {} };
  recordEpisode(ledger, "clawhub:my-skill", "my-skill", "My Skill", 3, "2026-03-30");

  saveLedger(tmpDir, ledger);
  const loaded = loadLedger(tmpDir);

  assert.equal(loaded.version, 1);
  const entry = loaded.entries["clawhub:my-skill"];
  assert.ok(entry, "entry should exist after round-trip");
  assert.equal(entry.slug, "my-skill");
  assert.equal(entry.name, "My Skill");
  assert.equal(entry.lastRank, 3);
  assert.equal(entry.timesFeatures, 1);
  assert.equal(entry.firstSeenEpisode, "2026-03-30");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("loadLedger: returns empty ledger when file is missing", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dedupe-test-"));
  const ledger = loadLedger(tmpDir);
  assert.equal(ledger.version, 1);
  assert.deepEqual(ledger.entries, {});
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("recordEpisode: increments timesFeatures on repeat", () => {
  const ledger: EpisodeLedger = { version: 1, entries: {} };
  recordEpisode(ledger, "gh:user/repo", "user/repo", "repo", 1, "2026-01-01");
  recordEpisode(ledger, "gh:user/repo", "user/repo", "repo", 2, "2026-03-30");

  const entry = ledger.entries["gh:user/repo"];
  assert.equal(entry?.timesFeatures, 2);
  assert.equal(entry?.firstSeenEpisode, "2026-01-01");
  assert.equal(entry?.lastSeenEpisode, "2026-03-30");
  assert.equal(entry?.lastRank, 2);
});
