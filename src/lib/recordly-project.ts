import fs from "node:fs/promises";
import path from "node:path";

import type { GitHubWalkthroughCue } from "../../scripts/lib/github-walkthrough";

export interface RecordlyCaptureDefaults {
  webcamEnabled: boolean;
  microphoneEnabled: boolean;
  systemAudioEnabled: boolean;
  countdownDelay: number;
}

export interface RecordlyZoomFocus {
  cx: number;
  cy: number;
}

export interface RecordlyZoomRegion {
  id: string;
  startMs: number;
  endMs: number;
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  focus: RecordlyZoomFocus;
}

export interface RecordlyProjectData {
  version: number;
  videoPath: string;
  editor: {
    wallpaper: string;
    shadowIntensity: number;
    backgroundBlur: number;
    zoomMotionBlur: number;
    connectZooms: boolean;
    zoomInDurationMs: number;
    zoomInOverlapMs: number;
    zoomOutDurationMs: number;
    connectedZoomGapMs: number;
    connectedZoomDurationMs: number;
    zoomInEasing: "recordly" | "glide" | "smooth" | "snappy" | "linear";
    zoomOutEasing: "recordly" | "glide" | "smooth" | "snappy" | "linear";
    connectedZoomEasing: "recordly" | "glide" | "smooth" | "snappy" | "linear";
    showCursor: boolean;
    loopCursor: boolean;
    cursorStyle: "tahoe" | "dot" | "figma" | "mono";
    cursorSize: number;
    cursorSmoothing: number;
    cursorMotionBlur: number;
    cursorClickBounce: number;
    cursorClickBounceDuration: number;
    cursorSway: number;
    borderRadius: number;
    padding: number;
    cropRegion: { x: number; y: number; width: number; height: number };
    zoomRegions: RecordlyZoomRegion[];
    trimRegions: Array<unknown>;
    speedRegions: Array<unknown>;
    annotationRegions: Array<unknown>;
    audioRegions: Array<unknown>;
    autoCaptions: Array<unknown>;
    autoCaptionSettings: {
      enabled: boolean;
      language: string;
      fontFamily: string;
      fontSize: number;
      bottomOffset: number;
      maxWidth: number;
      maxRows: number;
      animationStyle: "none" | "fade" | "rise" | "pop";
      boxRadius: number;
      textColor: string;
      inactiveTextColor: string;
      backgroundOpacity: number;
    };
    webcam: {
      enabled: boolean;
      sourcePath: string | null;
      mirror: boolean;
      corner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
      positionPreset:
        | "top-left"
        | "top-center"
        | "top-right"
        | "center-left"
        | "center"
        | "center-right"
        | "bottom-left"
        | "bottom-center"
        | "bottom-right"
        | "custom";
      positionX: number;
      positionY: number;
      size: number;
      reactToZoom: boolean;
      cornerRadius: number;
      shadow: number;
      margin: number;
    };
    aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "native";
    exportQuality: "medium" | "good" | "high" | "source";
    exportFormat: "mp4" | "gif";
    gifFrameRate: 15 | 20 | 25 | 30;
    gifLoop: boolean;
    gifSizePreset: "medium" | "large" | "original";
  };
}

export interface BuildRecordlyProjectInput {
  videoPath: string;
  durationMs: number;
  cues: GitHubWalkthroughCue[];
  webcamPath?: string | null;
}

export interface WrittenRecordlyProject {
  projectPath: string;
  project: RecordlyProjectData;
}

export function buildRecordlyCaptureDefaults(): RecordlyCaptureDefaults {
  return {
    webcamEnabled: false,
    microphoneEnabled: false,
    systemAudioEnabled: false,
    countdownDelay: 0,
  };
}

export function cuesToRecordlyZoomRegions(
  cues: GitHubWalkthroughCue[],
  durationMs: number,
): RecordlyZoomRegion[] {
  return cues.map((cue, index) => {
    const startMs = clamp(Math.round(cue.timestampMs - 800), 0, Math.max(0, durationMs - 100));
    const endMs = clamp(Math.round(cue.timestampMs + 2400), startMs + 100, durationMs);
    return {
      id: `zoom-${index + 1}`,
      startMs,
      endMs,
      depth: pickZoomDepth(cue.label),
      focus: {
        cx: clamp01(cue.normalizedX),
        cy: clamp01(cue.normalizedY),
      },
    };
  });
}

export function buildRecordlyProjectData(
  input: BuildRecordlyProjectInput,
): RecordlyProjectData {
  return {
    version: 1,
    videoPath: input.videoPath,
    editor: {
      wallpaper: "",
      shadowIntensity: 0.58,
      backgroundBlur: 1,
      zoomMotionBlur: 0.14,
      connectZooms: true,
      zoomInDurationMs: 620,
      zoomInOverlapMs: 180,
      zoomOutDurationMs: 520,
      connectedZoomGapMs: 850,
      connectedZoomDurationMs: 560,
      zoomInEasing: "smooth",
      zoomOutEasing: "smooth",
      connectedZoomEasing: "glide",
      showCursor: true,
      loopCursor: false,
      cursorStyle: "tahoe",
      cursorSize: 2.45,
      cursorSmoothing: 0.52,
      cursorMotionBlur: 0.16,
      cursorClickBounce: 1.2,
      cursorClickBounceDuration: 250,
      cursorSway: 0.08,
      borderRadius: 16,
      padding: 18,
      cropRegion: { x: 0, y: 0, width: 1, height: 1 },
      zoomRegions: cuesToRecordlyZoomRegions(input.cues, input.durationMs),
      trimRegions: [],
      speedRegions: [],
      annotationRegions: [],
      audioRegions: [],
      autoCaptions: [],
      autoCaptionSettings: {
        enabled: false,
        language: "en",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        fontSize: 30,
        bottomOffset: 3,
        maxWidth: 62,
        maxRows: 1,
        animationStyle: "fade",
        boxRadius: 17.5,
        textColor: "#FFFFFF",
        inactiveTextColor: "#A3A3A3",
        backgroundOpacity: 0.9,
      },
      webcam: {
        enabled: false,
        sourcePath: input.webcamPath ?? null,
        mirror: true,
        corner: "bottom-right",
        positionPreset: "bottom-right",
        positionX: 1,
        positionY: 1,
        size: 40,
        reactToZoom: true,
        cornerRadius: 90,
        shadow: 0.67,
        margin: 24,
      },
      aspectRatio: "16:9",
      exportQuality: "good",
      exportFormat: "mp4",
      gifFrameRate: 15,
      gifLoop: true,
      gifSizePreset: "medium",
    },
  };
}

export async function writeRecordlyProjectFile(
  input: BuildRecordlyProjectInput & { outputDir?: string },
): Promise<WrittenRecordlyProject> {
  const project = buildRecordlyProjectData(input);
  const outputDir = input.outputDir ?? path.dirname(input.videoPath);
  const fileName = `${path.basename(input.videoPath, path.extname(input.videoPath))}.recordly`;
  const projectPath = path.join(outputDir, fileName);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(projectPath, JSON.stringify(project, null, 2), "utf8");

  return { projectPath, project };
}

function pickZoomDepth(label: string): 1 | 2 | 3 | 4 | 5 | 6 {
  if (label.includes("code") || label.includes("sample")) {
    return 4;
  }

  if (label.includes("repo-title") || label.includes("star")) {
    return 2;
  }

  return 3;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
