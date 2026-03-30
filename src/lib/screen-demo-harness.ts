import fs from "fs";
import path from "path";
import {
  BrowsePlan,
  BrowsePlanSchema,
  BrowseStep,
  CameraKeyframe,
  DemoClip,
  DemoMoment,
  EditConfig,
  EditConfigSchema,
  NarrationBeat,
} from "./screen-demo-types";

export interface CreateScreenDemoProjectInput {
  rootDir: string;
  instructions: string;
  now?: Date;
}

export interface ScreenDemoProject {
  slug: string;
  projectDir: string;
  promptPath: string;
  scriptPath: string;
  browsePlanPath: string;
  sessionPath: string;
  momentsPath: string;
  cameraConfigPath: string;
  editConfigPath: string;
  renderPropsPath: string;
  outputVideoPath: string;
}

const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };

export function createScreenDemoProject(
  input: CreateScreenDemoProjectInput,
): ScreenDemoProject {
  const slug = slugifyPrompt(input.instructions);
  const stamp = toTimestamp(input.now ?? new Date());
  const projectDir = path.join(input.rootDir, "screen-demos", `${slug}-${stamp}`);
  fs.mkdirSync(projectDir, { recursive: true });

  const project: ScreenDemoProject = {
    slug,
    projectDir,
    promptPath: path.join(projectDir, "prompt.txt"),
    scriptPath: path.join(projectDir, "script.txt"),
    browsePlanPath: path.join(projectDir, "browse-plan.json"),
    sessionPath: path.join(projectDir, "session.json"),
    momentsPath: path.join(projectDir, "moments.json"),
    cameraConfigPath: path.join(projectDir, "camera-config.json"),
    editConfigPath: path.join(projectDir, "edit-config.json"),
    renderPropsPath: path.join(projectDir, "render-props.json"),
    outputVideoPath: path.join(projectDir, "demo.mp4"),
  };

  fs.writeFileSync(project.promptPath, input.instructions.trim());
  return project;
}

export function buildDraftBrowsePlan(prompt: string): BrowsePlan {
  const urls = extractUrls(prompt);
  const uniqueUrls = Array.from(new Set(urls));
  const safeUrls = uniqueUrls.length > 0 ? uniqueUrls : ["https://example.com"];
  const title = toTitleFromPrompt(prompt);
  const narration = buildNarrationBeats(prompt, safeUrls);
  const steps = narration.flatMap((beat, index) => buildGitHubBrowseSteps(beat, index));

  return BrowsePlanSchema.parse({
    version: 1,
    title,
    prompt,
    urls: safeUrls,
    narration,
    viewport: DEFAULT_VIEWPORT,
    steps,
  });
}

export function buildNarrationBeats(prompt: string, urls: string[]): NarrationBeat[] {
  return urls.map((url) => {
    const repoName = humanRepoName(url);
    const repoSlug = rawRepoName(url);
    const circleCount = toDeterministicCircleCount(`${prompt}::${url}`);
    const focusSelectors = [
      '[itemprop="name"] a',
      '[data-testid="repository-description"]',
      '#readme h1, #readme h2, article.markdown-body h1, article.markdown-body h2',
      'article.markdown-body p, article.markdown-body li',
    ];

    return {
      url,
      line: `${repoSlug} is the focus here, so start on the repository header, then move into the readme and key proof points.`,
      focusLabel: `${repoName} overview`,
      focusSelectors,
      circleCount,
    };
  });
}

export function buildScreenDemoScript(narration: NarrationBeat[]): string {
  return narration
    .map((beat, index) => `Scene ${index + 1}: ${beat.line} Focus on ${beat.focusLabel}.`)
    .join(" ");
}

export function deriveClipSegments(
  moments: DemoMoment[],
  recordingDurationMs: number,
): DemoClip[] {
  if (moments.length === 0) {
    return [];
  }

  const sorted = [...moments].sort((a, b) => a.timeMs - b.timeMs);
  const rawSegments = sorted.map((moment) => ({
    startMs: Math.max(0, moment.timeMs - 500),
    endMs: Math.min(recordingDurationMs, (moment.endMs ?? moment.timeMs) + 1000),
    labels: [moment.label],
  }));

  const merged: DemoClip[] = [];
  for (const segment of rawSegments) {
    const last = merged.at(-1);
    if (!last) {
      merged.push(segment);
      continue;
    }

    if (segment.startMs - last.endMs < 2000) {
      last.endMs = Math.max(last.endMs, segment.endMs);
      last.labels.push(...segment.labels);
      continue;
    }

    merged.push(segment);
  }

  return merged;
}

export function normalizeMomentsToRecordingDuration(
  moments: DemoMoment[],
  recordingDurationMs: number,
): DemoMoment[] {
  if (moments.length === 0 || recordingDurationMs <= 0) {
    return moments;
  }

  const lastMomentEndMs = Math.max(
    ...moments.map((moment) => moment.endMs ?? moment.timeMs),
    0,
  );
  if (lastMomentEndMs <= 0) {
    return moments;
  }

  const scale = recordingDurationMs / lastMomentEndMs;
  return moments.map((moment) => ({
    ...moment,
    timeMs: Math.round(moment.timeMs * scale),
    endMs: Math.round((moment.endMs ?? moment.timeMs) * scale),
  }));
}

export function deriveCameraKeyframes(
  moments: DemoMoment[],
  viewport = DEFAULT_VIEWPORT,
): CameraKeyframe[] {
  return moments
    .filter((moment) => moment.bounds)
    .map((moment) => {
      const bounds = moment.bounds!;
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const widthRatio = viewport.width / bounds.width;
      const heightRatio = viewport.height / bounds.height;
      const scale = clamp(Math.min(widthRatio, heightRatio) * 0.45, 1, 2.2);

      return {
        timeMs: moment.timeMs,
        scale,
        centerX,
        centerY,
        label: moment.label,
      };
    });
}

export function buildEditConfig(
  moments: DemoMoment[],
  recordingDurationMs: number,
  backgroundMode: "dark" | "light" = "dark",
): EditConfig {
  return EditConfigSchema.parse({
    playbackRate: 4,
    fps: 30,
    clips: deriveClipSegments(moments, recordingDurationMs),
    camera: deriveCameraKeyframes(moments),
    backgroundMode,
  });
}

export function writeJsonFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function extractUrls(prompt: string): string[] {
  return Array.from(prompt.matchAll(/https?:\/\/[^\s"')]+/g), (match) => match[0]);
}

function buildGitHubBrowseSteps(beat: NarrationBeat, index: number): BrowseStep[] {
  const labelPrefix = `page-${index + 1}`;
  return [
    { action: "navigate", label: `${labelPrefix}-open`, url: beat.url, durationMs: 0, scriptLine: beat.line },
    { action: "wait", label: `${labelPrefix}-settle`, durationMs: 1500, scriptLine: beat.line },
    {
      action: "hover",
      label: `${labelPrefix}-header-focus`,
      selectorCandidates: ['[itemprop="name"] a', 'strong[itemprop="name"] a', 'h1'],
      targetKind: "header",
      circleCount: beat.circleCount,
      scriptLine: beat.line,
    },
    {
      action: "hover",
      label: `${labelPrefix}-description-focus`,
      selectorCandidates: ['[data-testid="repository-description"]', 'article.markdown-body p'],
      targetKind: "description",
      circleCount: 1,
      scriptLine: beat.line,
    },
    {
      action: "scroll",
      label: `${labelPrefix}-scroll-main`,
      deltaY: 560,
      durationMs: 1600,
      smooth: true,
      targetKind: "readme",
      scriptLine: beat.line,
    },
    {
      action: "hover",
      label: `${labelPrefix}-readme-focus`,
      selectorCandidates: ['#readme h1, #readme h2', 'article.markdown-body h1, article.markdown-body h2', 'article.markdown-body pre'],
      targetKind: "readme",
      circleCount: 1,
      scriptLine: beat.line,
    },
    {
      action: "click",
      label: `${labelPrefix}-open-link`,
      selectorCandidates: [
        '#readme a[href^="https://"]:not([href*="github.com"])',
        'article.markdown-body a[href^="https://"]:not([href*="github.com"])',
      ],
      targetKind: "link",
      optional: true,
      scriptLine: beat.line,
    },
    {
      action: "wait",
      label: `${labelPrefix}-link-preview-pause`,
      durationMs: 1200,
      optional: true,
      scriptLine: beat.line,
    },
    { action: "goBack", label: `${labelPrefix}-return-from-link`, optional: true, scriptLine: beat.line },
    {
      action: "click",
      label: `${labelPrefix}-play-video`,
      selectorCandidates: [
        '#readme video',
        '#readme a[href*="youtube.com"]',
        '#readme a[href*="youtu.be"]',
        '#readme a[href$=".mp4"]',
        'article.markdown-body video',
      ],
      targetKind: "video",
      optional: true,
      scriptLine: beat.line,
    },
    {
      action: "wait",
      label: `${labelPrefix}-video-preview`,
      durationMs: 1600,
      optional: true,
      scriptLine: beat.line,
    },
    {
      action: "scroll",
      label: `${labelPrefix}-scroll-secondary`,
      deltaY: 340,
      durationMs: 1300,
      smooth: true,
      targetKind: "readme",
      scriptLine: beat.line,
    },
  ];
}

function slugifyPrompt(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "screen-demo";
}

function humanRepoName(repoUrl: string): string {
  const repo = rawRepoName(repoUrl);
  return repo.replace(/[-_]+/g, " ");
}

function rawRepoName(repoUrl: string): string {
  const url = new URL(repoUrl);
  return url.pathname.split("/").filter(Boolean).at(-1) ?? repoUrl;
}

function toDeterministicCircleCount(seed: string): 1 | 2 {
  let total = 0;
  for (const char of seed) {
    total += char.charCodeAt(0);
  }
  return total % 2 === 0 ? 2 : 1;
}

function toTitleFromPrompt(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean;
}

function toTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
