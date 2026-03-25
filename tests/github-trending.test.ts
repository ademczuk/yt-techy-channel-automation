import test from "node:test";
import assert from "node:assert/strict";
import { parseGitHubTrending } from "../src/lib/github-trending";

test("parses repo entries from GitHub trending markup", () => {
  const html = `
    <article class="Box-row">
      <h2><a href="/openai/codex"> openai / codex </a></h2>
      <p class="col-9 color-fg-muted my-1 pr-4">AI coding agent for software tasks.</p>
      <span itemprop="programmingLanguage">TypeScript</span>
      <span>1,234 stars today</span>
    </article>
  `;

  const results = parseGitHubTrending(html, "2026-03-23T00:00:00.000Z");

  assert.equal(results.length, 1);
  assert.equal(results[0]?.slug, "openai/codex");
  assert.equal(results[0]?.name, "codex");
  assert.equal(results[0]?.description, "AI coding agent for software tasks.");
  assert.equal(results[0]?.language, "TypeScript");
  assert.equal(results[0]?.starsToday, 1234);
});
