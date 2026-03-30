import type { CandidateTool } from "./candidate-types";
import {
  classifyFit,
  getCandidateFamilyKey,
  isCandidateAllowed,
  type FitBucket,
} from "./editorial-rules";

export interface RankedCandidate extends CandidateTool {
  score: number;
  reasons: string[];
  fitBucket: FitBucket;
}

export function rankCandidates(
  candidates: CandidateTool[],
  limit: number,
): RankedCandidate[] {
  const ranked = candidates
    .filter(isCandidateAllowed)
    .map((candidate) => {
      const reasons: string[] = [];
      let score = 0;
      const fit = classifyFit(candidate);

      const starsToday = candidate.starsToday ?? 0;
      score += Math.min(starsToday / 100, 50);
      if (starsToday > 1000) {
        reasons.push("high daily star velocity");
      }

      if (fit.bucket === "core") {
        score += 22;
        reasons.push(...fit.reasons);
      } else if (fit.bucket === "adjacent") {
        score += 10;
        reasons.push(...fit.reasons);
      }

      if (candidate.description && candidate.description.length > 40) {
        score += 10;
        reasons.push("clear explanation");
      }

      if (candidate.language) {
        score += 5;
      }

      if (candidate.source === "clawhub") {
        score += 15;
        reasons.push("clawhub skill — primary showcase source");
      }

      return {
        ...candidate,
        score,
        reasons,
        fitBucket: fit.bucket,
      };
    })
    .sort((a, b) => b.score - a.score);

  const familyCounts = new Map<string, number>();
  const penalized = ranked.map((candidate) => {
    const familyKey = getCandidateFamilyKey(candidate);
    const seen = familyCounts.get(familyKey) ?? 0;
    familyCounts.set(familyKey, seen + 1);

    if (seen === 0) {
      return candidate;
    }

    return {
      ...candidate,
      score: candidate.score - 18,
      reasons: [...candidate.reasons, "duplicate-family penalty"],
    };
  });

  return penalized
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((candidate, index) => ({
      ...candidate,
      reasons:
        candidate.reasons.length > 0
          ? candidate.reasons
          : [`selected at rank ${index + 1}`],
    }));
}
