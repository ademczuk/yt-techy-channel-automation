export interface LiveRepoStep {
  repoUrl: string;
  slug: string;
  expectedTitleFragment: string;
  tabIndex: number;
  hoverSelectors: string[];
  scrollSequence: number[];
}

const DEFAULT_SCROLL_SEQUENCE = [420, 360, 300, -180];

export function slugFromRepoUrl(repoUrl: string): string {
  const url = new URL(repoUrl);
  return url.pathname.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\//g, "-");
}

export function titleFragmentFromRepoUrl(repoUrl: string): string {
  const url = new URL(repoUrl);
  const segments = url.pathname.split("/").filter(Boolean);
  return segments.at(-1) ?? repoUrl;
}

export function buildLiveRepoSteps(repoUrls: string[]): LiveRepoStep[] {
  return repoUrls.map((repoUrl, index) => ({
    repoUrl,
    slug: slugFromRepoUrl(repoUrl),
    expectedTitleFragment: titleFragmentFromRepoUrl(repoUrl),
    tabIndex: index,
    hoverSelectors: [
      '[itemprop="name"] a',
      '[data-testid="repository-description"]',
      '#readme h1, #readme h2, article.markdown-body h1, article.markdown-body h2',
      'article.markdown-body pre, article.markdown-body h3, #readme article h3',
    ],
    scrollSequence: [...DEFAULT_SCROLL_SEQUENCE],
  }));
}

