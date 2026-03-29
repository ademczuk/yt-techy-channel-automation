import fs from "fs";
import path from "path";

export interface WebreelRepoSpec {
  slug: string;
  url: string;
  displayName: string;
}

export interface WebreelProofConfigInput {
  outDir: string;
  cursorAssetPath: string;
  repos: [WebreelRepoSpec, WebreelRepoSpec];
}

export interface WebreelArtifactReport {
  outputFiles: string[];
  timelineFiles: string[];
  rawFiles: string[];
  frameFiles: string[];
}

export type WebreelFailureStage =
  | "validate_config"
  | "record_demo"
  | "composite_demo"
  | "verify_video"
  | "ready";

export function buildWebreelProofConfig(input: WebreelProofConfigInput) {
  const [firstRepo, secondRepo] = input.repos;

  return {
    $schema: "https://webreel.dev/schema/v1.json",
    outDir: normalizeForWebreel(input.outDir),
    viewport: { width: 1920, height: 1080 },
    theme: {
      cursor: {
        image: input.cursorAssetPath,
        size: 28,
        hotspot: "top-left",
      },
    },
    defaultDelay: 900,
    clickDwell: 700,
    videos: {
      [firstRepo.slug]: buildRepoVideoConfig(firstRepo),
      [secondRepo.slug]: buildRepoVideoConfig(secondRepo),
    },
  };
}

export function buildRepoVideoConfig(repo: WebreelRepoSpec) {
  return {
    url: repo.url,
    waitFor: '[itemprop="name"] a',
    output: `${repo.slug}.mp4`,
    fps: 30,
    quality: 86,
    steps: buildRepoSteps(),
  };
}

export function buildRepoSteps() {
  return [
    { action: "pause", ms: 1400 },
    { action: "moveTo", selector: '[itemprop="name"] a', delay: 1100, description: "repo-title" },
    { action: "hover", selector: '[itemprop="name"] a', delay: 900, description: "repo-title-hover" },
    { action: "pause", ms: 1200 },
    { action: "moveTo", selector: 'article.markdown-body, #readme', delay: 1000, description: "repo-overview" },
    { action: "pause", ms: 1100 },
    { action: "moveTo", selector: '#repo-stars-counter-star, a[href$="/stargazers"]', delay: 1000, description: "repo-stars" },
    { action: "pause", ms: 1000 },
    { action: "scroll", y: 360, delay: 1100 },
    { action: "scroll", y: 300, delay: 1050 },
    { action: "moveTo", selector: 'article.markdown-body h1, article.markdown-body h2, #readme h1, #readme h2', delay: 1200, description: "readme-heading" },
    { action: "pause", ms: 1300 },
    { action: "scroll", y: 280, delay: 1000 },
    { action: "moveTo", selector: 'article.markdown-body pre, article.markdown-body code, #readme pre', delay: 1200, description: "readme-code" },
    { action: "pause", ms: 1200 },
    { action: "scroll", y: -260, delay: 1000 },
    { action: "moveTo", selector: '[itemprop="name"] a', delay: 1100, description: "repo-return" },
    { action: "pause", ms: 900 },
  ];
}

export function listWebreelArtifacts(configDir: string, outputDir: string = configDir): WebreelArtifactReport {
  const timelineRoot = path.join(configDir, ".webreel", "timelines");
  const rawRoot = path.join(configDir, ".webreel", "raw");
  const frameRoot = path.join(configDir, ".webreel", "frames");

  return {
    outputFiles: walkMatching(outputDir, (value) => value.endsWith(".mp4")),
    timelineFiles: walkMatching(timelineRoot, (value) => value.endsWith(".timeline.json")),
    rawFiles: walkMatching(rawRoot, () => true),
    frameFiles: walkMatching(frameRoot, (value) => value.endsWith(".jpg") || value.endsWith(".jpeg") || value.endsWith(".png")),
  };
}

export function inferWebreelFailureStage(report: WebreelArtifactReport): WebreelFailureStage {
  if (report.outputFiles.length > 0) {
    return "ready";
  }

  if (report.rawFiles.length > 0 || report.frameFiles.length > 0) {
    return "composite_demo";
  }

  if (report.timelineFiles.length > 0) {
    return "record_demo";
  }

  return "validate_config";
}

export function toRuntimeAssetPath(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, "/");
  const runtimeMarker = "/runtime/";
  const runtimeIndex = normalized.indexOf(runtimeMarker);
  return runtimeIndex >= 0 ? `runtime/${normalized.slice(runtimeIndex + runtimeMarker.length)}` : normalized;
}

function walkMatching(rootDir: string, predicate: (value: string) => boolean): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const results: string[] = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMatching(fullPath, predicate));
      continue;
    }
    const normalized = fullPath.replace(/\\/g, "/").toLowerCase();
    if (entry.isFile() && predicate(normalized)) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

function normalizeForWebreel(value: string): string {
  return value.replace(/\\/g, "/");
}
