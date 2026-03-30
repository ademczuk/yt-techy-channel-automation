import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { runGitHubDiscoveryStage } from "../src/lib/harness-discovery";

test("runGitHubDiscoveryStage dedupes, ranks, and writes deterministic outputs", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-discovery-"));
  const runDir = path.join(rootDir, "runtime", "runs", "2026-03-29", "run-discovery-001");
  fs.mkdirSync(runDir, { recursive: true });

  const html = `
    <article class="Box-row">
      <h2><a href="/openai/codex"> openai / codex </a></h2>
      <p class="col-9 color-fg-muted my-1 pr-4">AI coding agent for developer workflows.</p>
      <span itemprop="programmingLanguage">TypeScript</span>
      <span>1,234 stars today</span>
    </article>
    <article class="Box-row">
      <h2><a href="/openai/codex"> openai / codex </a></h2>
      <p class="col-9 color-fg-muted my-1 pr-4">Duplicate entry that should collapse.</p>
      <span itemprop="programmingLanguage">TypeScript</span>
      <span>1,111 stars today</span>
    </article>
    <article class="Box-row">
      <h2><a href="/bytedance/deer-flow"> bytedance / deer-flow </a></h2>
      <p class="col-9 color-fg-muted my-1 pr-4">Open-source long-horizon superagent harness for research and coding.</p>
      <span itemprop="programmingLanguage">Python</span>
      <span>987 stars today</span>
    </article>
    <article class="Box-row">
      <h2><a href="/sponsors/sponsor-tool"> sponsors / sponsor-tool </a></h2>
      <p class="col-9 color-fg-muted my-1 pr-4">Sponsored listing that should be filtered.</p>
      <span>900 stars today</span>
    </article>
  `;

  const result = await runGitHubDiscoveryStage({
    runDir,
    limit: 5,
    collectedAt: "2026-03-29T21:00:00.000Z",
    fetchTrendingHtml: async () => html,
    enrichCandidates: async (candidates) => candidates.map((candidate) => ({
      ...candidate,
      readmeSummary: candidate.description,
    })),
  });

  assert.equal(result.candidates.length, 2);
  assert.deepEqual(
    result.candidates.map((candidate) => candidate.slug),
    ["bytedance/deer-flow", "openai/codex"],
  );
  assert.ok(fs.existsSync(result.outputPath));
  assert.ok(fs.existsSync(result.summaryPath));

  const written = JSON.parse(fs.readFileSync(result.outputPath, "utf8")) as Array<{ slug: string }>;
  assert.deepEqual(
    written.map((candidate) => candidate.slug),
    ["bytedance/deer-flow", "openai/codex"],
  );

  const summary = fs.readFileSync(result.summaryPath, "utf8");
  assert.match(summary, /Discovery Summary/);
  assert.match(summary, /openai\/codex/);
});
