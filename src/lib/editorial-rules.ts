import type { CandidateTool } from "./candidate-types";

export function isCandidateAllowed(candidate: CandidateTool): boolean {
  const normalizedUrl = candidate.url.toLowerCase();
  const normalizedSlug = candidate.slug.toLowerCase();

  if (normalizedUrl.includes("/sponsors/") || normalizedSlug.startsWith("sponsors/")) {
    return false;
  }

  return true;
}

export type FitBucket = "core" | "adjacent" | "exclude";

const CORE_PATTERNS = [
  /agent/,
  /claude/,
  /codex/,
  /\bmcp\b/,
  /automation/,
  /developer/,
  /\bdev\b/,
  /tooling/,
  /browser/,
  /screen record/,
  /terminal/,
  /workflow/,
  /\bapi\b/,
  /\bsdk\b/,
  /clawhub/,
  /openclaw/,
  /\bskill\b/,
  /agent skill/,
  /agentskill/,
];

const ADJACENT_PATTERNS = [
  /security/,
  /stream/,
  /media/,
  /dashboard/,
  /infrastructure/,
  /database/,
  /trading/,
  /finance/,
  /ops/,
  /monitor/,
  /player/,
  /iptv/,
  /video/,
  /creator/,
];

export function classifyFit(candidate: CandidateTool): {
  bucket: FitBucket;
  reasons: string[];
} {
  if (!isCandidateAllowed(candidate)) {
    return { bucket: "exclude", reasons: ["sponsor or non-project entry"] };
  }

  const text =
    `${candidate.name} ${candidate.description ?? ""} ${candidate.readmeSummary ?? ""}`.toLowerCase();

  const coreMatches = CORE_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const adjacentMatches = ADJACENT_PATTERNS.filter((pattern) =>
    pattern.test(text),
  ).length;

  if (coreMatches > 0) {
    return {
      bucket: "core",
      reasons: ["credible core fit for developers and automation users"],
    };
  }

  if (adjacentMatches > 0) {
    return {
      bucket: "adjacent",
      reasons: ["credible adjacent software-builder use case"],
    };
  }

  return {
    bucket: "adjacent",
    reasons: ["needs stronger README or docs enrichment before scripting"],
  };
}

export function getCandidateFamilyKey(candidate: CandidateTool): string {
  return candidate.name
    .toLowerCase()
    .replace(/-cn$|-zh$|-python$|-js$|-ts$/g, "")
    .replace(/[^a-z0-9]+/g, "");
}
