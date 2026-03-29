export interface HumanBrowserPlan {
  repoUrls: string[];
  perRepoDurationMs: number;
  betweenReposMs: number;
}

export function buildHumanBrowserPlan(
  repoUrls: string[],
  perRepoSeconds = 12,
  betweenReposMs = 1200,
): HumanBrowserPlan {
  return {
    repoUrls,
    perRepoDurationMs: Math.max(5, perRepoSeconds) * 1000,
    betweenReposMs: Math.max(0, betweenReposMs),
  };
}

