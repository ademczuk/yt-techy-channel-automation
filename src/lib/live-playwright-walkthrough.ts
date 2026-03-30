import type { BrowserWindowMetrics } from "./live-playwright-demo";
import type { HarnessRecordingPlan, RecordingBeatPlan, RecordingRepoPlan, RecordingTabPlan } from "./harness-recording-plan";

export interface LiveRepoExecution {
  repoUrl: string;
  slug: string;
  name: string;
  tabIndex: number;
  expectedTitleFragment: string;
  segmentDurationMs: number;
  beats: RecordingBeatPlan[];
}

export interface LiveExecutionPlan {
  introLeadInMs: number;
  tabs: RecordingTabPlan[];
  repoExecutions: LiveRepoExecution[];
}

export function slugFromRepoUrl(repoUrl: string): string {
  const url = new URL(repoUrl);
  return url.pathname.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\//g, "-");
}

export function titleFragmentFromRepoUrl(repoUrl: string): string {
  const url = new URL(repoUrl);
  const segments = url.pathname.split("/").filter(Boolean);
  return segments.at(-1) ?? repoUrl;
}

export function buildLiveExecutionPlan(plan: HarnessRecordingPlan): LiveExecutionPlan {
  return {
    introLeadInMs: plan.introLeadInMs,
    tabs: plan.tabs,
    repoExecutions: plan.repos.map((repo) => buildRepoExecution(repo)),
  };
}

export function buildTabStripChromePoint(
  metrics: BrowserWindowMetrics,
  tabIndex: number,
  tabCount: number,
): { x: number; y: number } | null {
  const horizontalBorder = Math.max(0, (metrics.outerWidth - metrics.innerWidth) / 2);
  const verticalChrome = Math.max(0, metrics.outerHeight - metrics.innerHeight - horizontalBorder);
  if (verticalChrome <= 0 || tabCount <= 0) {
    return null;
  }

  const usableWidth = Math.max(400, metrics.outerWidth - 240);
  const tabWidth = Math.max(150, Math.min(240, Math.floor(usableWidth / Math.max(1, tabCount))));
  const startX = Math.max(120, Math.round(horizontalBorder + 120));
  const maxTabIndex = Math.max(0, tabCount - 1);
  const clampedTabIndex = Math.max(0, Math.min(maxTabIndex, tabIndex));
  const x = startX + (clampedTabIndex * tabWidth) + Math.floor(tabWidth / 2);
  const y = Math.max(18, Math.min(verticalChrome - 8, Math.round(verticalChrome * 0.42)));

  return { x, y };
}

function buildRepoExecution(repo: RecordingRepoPlan): LiveRepoExecution {
  return {
    repoUrl: repo.repoUrl,
    slug: repo.slug,
    name: repo.name,
    tabIndex: repo.tabIndex,
    expectedTitleFragment: titleFragmentFromRepoUrl(repo.repoUrl),
    segmentDurationMs: repo.segmentDurationMs,
    beats: repo.beats,
  };
}
