import fs from "node:fs";
import path from "node:path";
import {
  buildDraftBrowsePlan,
  buildScreenDemoScript,
  createScreenDemoProject,
  deriveClipSegments,
  writeJsonFile,
  type ScreenDemoProject,
} from "./screen-demo-harness";
import { renderScreenDemoFromProps } from "./screen-demo-render";
import type { BrowsePlan, DemoMoment } from "./screen-demo-types";
import { buildTrimmedLivePlaywrightEditConfig } from "./live-playwright-demo";

export interface RunLiveLocalScreenDemoPipelineInput {
  rootDir: string;
  prompt: string;
  recordingPath: string;
  rawDurationMs: number;
  moments: DemoMoment[];
  viewport: { width: number; height: number };
  audioManifest?: {
    provider: string;
    generatedAt: string;
    totalDurationMs: number;
    segments: Array<{
      id: string;
      label: string;
      path: string;
      durationMs: number;
    }>;
  };
  repoUrls?: string[];
  backgroundMode?: "dark" | "light";
  now?: Date;
  createProject?: (input: {
    rootDir: string;
    instructions: string;
    now?: Date;
  }) => ScreenDemoProject;
  buildPlan?: (prompt: string) => BrowsePlan;
  buildScript?: (narration: BrowsePlan["narration"]) => string;
  renderScreenDemo?: (input: {
    rootDir: string;
    propsPath: string;
    outputPath: string;
  }) => Promise<void>;
}

export interface RunLiveLocalScreenDemoPipelineResult {
  project: ScreenDemoProject;
  browsePlan: BrowsePlan;
  publicRecordingPath: string;
  normalizedMoments: DemoMoment[];
  editConfig: ReturnType<typeof buildTrimmedLivePlaywrightEditConfig>["editConfig"];
}

export async function runLiveLocalScreenDemoPipeline(
  input: RunLiveLocalScreenDemoPipelineInput,
): Promise<RunLiveLocalScreenDemoPipelineResult> {
  const createProject = input.createProject ?? createScreenDemoProject;
  const buildPlan = input.buildPlan ?? buildDraftBrowsePlan;
  const buildScript = input.buildScript ?? buildScreenDemoScript;
  const renderScreenDemo = input.renderScreenDemo ?? renderScreenDemoFromProps;
  const backgroundMode = input.backgroundMode ?? "dark";

  const project = createProject({
    rootDir: input.rootDir,
    instructions: input.prompt,
    now: input.now,
  });

  const browsePlan = buildPlan(input.prompt);
  writeJsonFile(project.browsePlanPath, browsePlan);
  fs.writeFileSync(project.scriptPath, `${buildScript(browsePlan.narration)}\n`, "utf8");

  const projectRecordingPath = path.join(project.projectDir, "recording.mp4");
  fs.copyFileSync(input.recordingPath, projectRecordingPath);

  const { normalizedMoments, editConfig } = buildTrimmedLivePlaywrightEditConfig(
    input.moments,
    input.rawDurationMs,
    backgroundMode,
  );
  const audioSync = input.audioManifest
    ? syncAudioIntoProjectAndPublicDir({
      rootDir: input.rootDir,
      projectDir: project.projectDir,
      audioManifest: input.audioManifest,
      repoUrls: input.repoUrls ?? buildRepoUrlsFromMoments(normalizedMoments),
      moments: normalizedMoments,
      recordingDurationMs: input.rawDurationMs,
    })
    : null;
  const publicRecordingPath = syncRecordingIntoPublicDir({
    rootDir: input.rootDir,
    projectDir: project.projectDir,
    recordingPath: projectRecordingPath,
  });

  writeJsonFile(project.momentsPath, normalizedMoments);
  writeJsonFile(project.cameraConfigPath, editConfig.camera);
  writeJsonFile(project.editConfigPath, editConfig);
  writeJsonFile(project.renderPropsPath, {
    recordingSrc: `/screen-demos/${path.basename(project.projectDir)}/recording.mp4`,
    clips: audioSync?.clips ?? editConfig.clips,
    camera: editConfig.camera,
    audioTracks: audioSync?.audioTracks ?? [],
    fps: editConfig.fps,
    backgroundMode: editConfig.backgroundMode,
    playbackRate: editConfig.playbackRate,
    visualOffsetMs: audioSync?.visualOffsetMs ?? 0,
    viewport: input.viewport,
  });

  await renderScreenDemo({
    rootDir: input.rootDir,
    propsPath: project.renderPropsPath,
    outputPath: project.outputVideoPath,
  });

  return {
    project,
    browsePlan,
    publicRecordingPath,
    normalizedMoments,
    editConfig,
  };
}

function syncRecordingIntoPublicDir(input: {
  rootDir: string;
  projectDir: string;
  recordingPath: string;
}): string {
  const publicRecordingDir = path.join(
    input.rootDir,
    "public",
    "screen-demos",
    path.basename(input.projectDir),
  );
  fs.mkdirSync(publicRecordingDir, { recursive: true });

  const publicRecordingPath = path.join(publicRecordingDir, "recording.mp4");
  fs.copyFileSync(input.recordingPath, publicRecordingPath);
  return publicRecordingPath;
}

function syncAudioIntoProjectAndPublicDir(input: {
  rootDir: string;
  projectDir: string;
  audioManifest: NonNullable<RunLiveLocalScreenDemoPipelineInput["audioManifest"]>;
  repoUrls: string[];
  moments: DemoMoment[];
  recordingDurationMs: number;
}): {
  audioTracks: Array<{ src: string; startMs: number; durationMs: number; label: string }>;
  clips: Array<{ startMs: number; endMs: number; timelineDurationMs?: number; labels: string[] }>;
  visualOffsetMs: number;
} {
  const projectAudioDir = path.join(input.projectDir, "audio");
  const publicAudioDir = path.join(input.rootDir, "public", "screen-demos", path.basename(input.projectDir), "audio");
  fs.mkdirSync(projectAudioDir, { recursive: true });
  fs.mkdirSync(publicAudioDir, { recursive: true });

  const introSegment = input.audioManifest.segments.find((segment) => segment.id === "intro");
  const leadBeforeVisualMs = introSegment ? introSegment.durationMs + 600 : 0;
  const audioTracks: Array<{ src: string; startMs: number; durationMs: number; label: string }> = [];

  if (introSegment) {
    const introName = path.basename(introSegment.path);
    fs.copyFileSync(introSegment.path, path.join(projectAudioDir, introName));
    fs.copyFileSync(introSegment.path, path.join(publicAudioDir, introName));
    audioTracks.push({
      src: `/screen-demos/${path.basename(input.projectDir)}/audio/${introName}`,
      startMs: 0,
      durationMs: introSegment.durationMs,
      label: introSegment.label,
    });
  }

  let currentStartMs = leadBeforeVisualMs;
  const clips = input.repoUrls.map((repoUrl) => {
    const repoClip = deriveRepoClip(input.moments, repoUrl, input.recordingDurationMs);
    const audioSegment = findRepoAudioSegment(input.audioManifest.segments, repoUrl);
    if (audioSegment) {
      const audioName = path.basename(audioSegment.path);
      fs.copyFileSync(audioSegment.path, path.join(projectAudioDir, audioName));
      fs.copyFileSync(audioSegment.path, path.join(publicAudioDir, audioName));
      audioTracks.push({
        src: `/screen-demos/${path.basename(input.projectDir)}/audio/${audioName}`,
        startMs: currentStartMs,
        durationMs: audioSegment.durationMs,
        label: audioSegment.label,
      });
    }

    const sourceDurationMs = Math.max(1, repoClip.endMs - repoClip.startMs);
    const timelineDurationMs = audioSegment
      ? Math.max(800, audioSegment.durationMs + 400)
      : sourceDurationMs;
    currentStartMs += timelineDurationMs;

    return {
      ...repoClip,
      timelineDurationMs,
    };
  });

  return {
    audioTracks,
    clips,
    visualOffsetMs: leadBeforeVisualMs,
  };
}

function deriveRepoClip(moments: DemoMoment[], repoUrl: string, recordingDurationMs: number) {
  const matchingMoments = moments.filter((moment) => normalizeUrl(moment.url) === normalizeUrl(repoUrl));
  const derived = deriveClipSegments(matchingMoments, recordingDurationMs);
  if (derived.length > 0) {
    return {
      startMs: derived[0]?.startMs ?? 0,
      endMs: derived.at(-1)?.endMs ?? recordingDurationMs,
      labels: derived.flatMap((clip) => clip.labels),
    };
  }

  return {
    startMs: 0,
    endMs: Math.min(recordingDurationMs, 2000),
    labels: [path.basename(new URL(repoUrl).pathname)],
  };
}

function findRepoAudioSegment(
  segments: NonNullable<RunLiveLocalScreenDemoPipelineInput["audioManifest"]>["segments"],
  repoUrl: string,
) {
  const repoSlug = new URL(repoUrl).pathname.replace(/^\/+/, "").replace(/\//g, "-").toLowerCase();
  return segments.find((segment) => segment.id.replace(/^repo-/, "").toLowerCase() === repoSlug);
}

function buildRepoUrlsFromMoments(moments: DemoMoment[]): string[] {
  const urls = moments
    .map((moment) => normalizeUrl(moment.url))
    .filter((url): url is string => Boolean(url));
  return [...new Set(urls)];
}

function normalizeUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const normalized = new URL(value);
    normalized.hash = "";
    return normalized.toString();
  } catch {
    return value;
  }
}
