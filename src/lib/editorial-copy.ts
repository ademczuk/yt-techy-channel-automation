import type { CandidateTool } from "./candidate-types";

export function selectEditorialSummary(candidate: CandidateTool): string {
  const fallback = candidate.description?.trim();
  const enriched = candidate.readmeSummary?.trim();

  if (!enriched) {
    return fallback ?? `${candidate.name} is trending today.`;
  }

  if (!fallback) {
    return enriched;
  }

  return scoreEditorialCopy(enriched) >= scoreEditorialCopy(fallback)
    ? enriched
    : fallback;
}

function scoreEditorialCopy(value: string): number {
  const text = value.toLowerCase();
  let score = 0;

  if (value.length >= 40 && value.length <= 220) {
    score += 3;
  }

  if (/\b(is|are|makes|helps|framework|platform|agent|tool|automation|browser|server|memory|workflow|open-source|gpt|llm|train|training|research)\b/.test(text)) {
    score += 5;
  }

  if (/[.!?]$/.test(value)) {
    score += 1;
  }

  if (/(default:|quickstart|install|setup|benchmark|repository|issue|docs|documentation|public url|environment-based|langgraph server|terminal interface)/.test(text)) {
    score -= 7;
  }

  if (/^\d+\./.test(value)) {
    score -= 10;
  }

  if (value.includes("|")) {
    score -= 5;
  }

  if (value.endsWith(":")) {
    score -= 6;
  }

  return score;
}
