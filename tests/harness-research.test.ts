import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { runGitHubResearchStage } from "../src/lib/harness-research";

test("runGitHubResearchStage converts discovery output into a deterministic shortlist and brief", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-research-"));
  const runDir = path.join(rootDir, "runtime", "runs", "2026-03-29", "run-research-001");
  fs.mkdirSync(runDir, { recursive: true });

  fs.writeFileSync(path.join(runDir, "discovery-candidates.json"), `${JSON.stringify([
    {
      slug: "bytedance/deer-flow",
      name: "deer-flow",
      source: "github-trending",
      url: "https://github.com/bytedance/deer-flow",
      description: "Open-source long-horizon superagent harness for research and coding.",
      readmeSummary: "deer-flow organizes planning, execution, and review into a structured multi-agent workflow.",
      language: "Python",
      starsToday: 987,
      collectedAt: "2026-03-29T21:00:00.000Z",
      score: 49.9,
      reasons: ["high daily star velocity", "credible core fit for developers and automation users"],
      fitBucket: "core",
    },
    {
      slug: "openai/codex",
      name: "codex",
      source: "github-trending",
      url: "https://github.com/openai/codex",
      description: "AI coding agent for developer workflows.",
      readmeSummary: "Codex helps developers run code tasks with agentic workflows and repository context.",
      language: "TypeScript",
      starsToday: 1234,
      collectedAt: "2026-03-29T21:00:00.000Z",
      score: 49.3,
      reasons: ["high daily star velocity", "credible core fit for developers and automation users"],
      fitBucket: "core",
    },
  ], null, 2)}\n`, "utf8");

  const result = await runGitHubResearchStage({
    runDir,
    selectionCount: 1,
  });

  assert.equal(result.selected.length, 1);
  assert.equal(result.selected[0]?.slug, "bytedance/deer-flow");
  assert.match(result.selected[0]?.recommendedAngle ?? "", /workflow|agent/i);
  assert.ok(fs.existsSync(result.shortlistPath));
  assert.ok(fs.existsSync(result.briefPath));

  const brief = fs.readFileSync(result.briefPath, "utf8");
  assert.match(brief, /Research Brief/);
  assert.match(brief, /bytedance\/deer-flow/);
  assert.match(brief, /Visual proof/);
});
