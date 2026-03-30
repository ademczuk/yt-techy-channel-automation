import fs from "node:fs";
import path from "node:path";
import type { CandidateTool } from "./candidate-types";
import { parseGitHubTrending } from "./github-trending";
import { enrichCandidatesWithReadmes } from "./readme-enrichment";
import { rankCandidates, type RankedCandidate } from "./ranker";

export interface GitHubDiscoveryStageResult {
  candidates: RankedCandidate[];
  outputPath: string;
  summaryPath: string;
  cacheDir: string;
}

export async function runGitHubDiscoveryStage(input: {
  runDir: string;
  limit: number;
  collectedAt?: string;
  since?: "daily" | "weekly" | "monthly";
  language?: string;
  fetchTrendingHtml?: (url: URL) => Promise<string>;
  enrichCandidates?: (candidates: CandidateTool[], cacheDir: string) => Promise<CandidateTool[]>;
}): Promise<GitHubDiscoveryStageResult> {
  const collectedAt = input.collectedAt ?? new Date().toISOString();
  const since = input.since ?? "daily";
  const url = new URL("https://github.com/trending");
  url.searchParams.set("since", since);
  if (input.language) {
    url.searchParams.set("l", input.language);
  }

  const rawCandidates = parseGitHubTrending(
    await (input.fetchTrendingHtml ?? fetchGitHubTrendingHtml)(url),
    collectedAt,
  );
  const dedupedCandidates = dedupeCandidates(rawCandidates);
  const cacheDir = path.join(input.runDir, "cache", "readmes");
  const enrichedCandidates = await (input.enrichCandidates ?? enrichCandidatesWithReadmes)(dedupedCandidates, cacheDir);
  const rankedCandidates = rankCandidates(enrichedCandidates, input.limit);

  const outputPath = path.join(input.runDir, "discovery-candidates.json");
  const summaryPath = path.join(input.runDir, "discovery-summary.md");
  fs.writeFileSync(outputPath, `${JSON.stringify(rankedCandidates, null, 2)}\n`, "utf8");
  fs.writeFileSync(summaryPath, `${buildDiscoverySummary(rankedCandidates, collectedAt)}\n`, "utf8");

  return {
    candidates: rankedCandidates,
    outputPath,
    summaryPath,
    cacheDir,
  };
}

async function fetchGitHubTrendingHtml(url: URL): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Code-Search-Daily/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub Trending: ${response.status}`);
  }

  return response.text();
}

function dedupeCandidates(candidates: CandidateTool[]): CandidateTool[] {
  const bySlug = new Map<string, CandidateTool>();

  for (const candidate of candidates) {
    const existing = bySlug.get(candidate.slug);
    if (!existing || (candidate.starsToday ?? 0) > (existing.starsToday ?? 0)) {
      bySlug.set(candidate.slug, candidate);
    }
  }

  return [...bySlug.values()];
}

function buildDiscoverySummary(candidates: RankedCandidate[], collectedAt: string): string {
  const lines = [
    "# Discovery Summary",
    "",
    `Collected at: ${collectedAt}`,
    `Selected candidates: ${candidates.length}`,
    "",
  ];

  for (const [index, candidate] of candidates.entries()) {
    lines.push(
      `${index + 1}. ${candidate.slug} — score ${candidate.score.toFixed(1)} — ${candidate.fitBucket}`,
    );
  }

  return lines.join("\n");
}
