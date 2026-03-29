import type { CameraKeyframe, DemoClip } from "./screen-demo-types";

export interface ScreenDemoTimelineClip {
  clip: DemoClip;
  fromFrame: number;
  durationInFrames: number;
  sourceStartFrame: number;
  sourceEndFrame: number;
}

export interface ScreenDemoCameraWindow {
  label: string;
  startFrame: number;
  peakStartFrame: number;
  peakEndFrame: number;
  endFrame: number;
  scale: number;
  centerX: number;
  centerY: number;
}

export function buildScreenDemoTimeline(
  clips: DemoClip[],
  fps: number,
  playbackRate: number,
): ScreenDemoTimelineClip[] {
  const safePlaybackRate = Math.max(playbackRate, 0.01);
  let currentFromFrame = 0;

  return clips.map((clip) => {
    const sourceStartFrame = msToFrames(clip.startMs, fps);
    const sourceDurationFrames = Math.max(1, msToFrames(clip.endMs - clip.startMs, fps));
    const durationInFrames = Math.max(1, Math.round(sourceDurationFrames / safePlaybackRate));
    const timelineClip: ScreenDemoTimelineClip = {
      clip,
      fromFrame: currentFromFrame,
      durationInFrames,
      sourceStartFrame,
      sourceEndFrame: sourceStartFrame + sourceDurationFrames,
    };
    currentFromFrame += durationInFrames;
    return timelineClip;
  });
}

export function calculateScreenDemoDurationInFrames(
  clips: DemoClip[],
  fps: number,
  playbackRate: number,
): number {
  const timeline = buildScreenDemoTimeline(clips, fps, playbackRate);
  const lastClip = timeline.at(-1);
  if (!lastClip) {
    return Math.max(1, fps);
  }
  return Math.max(1, lastClip.fromFrame + lastClip.durationInFrames);
}

export function buildCameraWindows(
  timelineClip: ScreenDemoTimelineClip,
  camera: CameraKeyframe[],
  fps: number,
  playbackRate: number,
): ScreenDemoCameraWindow[] {
  const safePlaybackRate = Math.max(playbackRate, 0.01);
  const matchingKeyframes = camera
    .filter((keyframe) => keyframe.timeMs >= timelineClip.clip.startMs && keyframe.timeMs <= timelineClip.clip.endMs)
    .sort((left, right) => left.timeMs - right.timeMs);

  const windows = matchingKeyframes.map((keyframe) => {
    const relativeMs = keyframe.timeMs - timelineClip.clip.startMs;
    const peakStartFrame = Math.max(0, Math.round(msToFrames(relativeMs, fps) / safePlaybackRate));
    const rampInFrames = 10;
    const rampOutFrames = 12;
    const holdFrames = keyframe.scale >= 1.8 ? 20 : 16;

    return {
      label: keyframe.label,
      startFrame: Math.max(0, peakStartFrame - rampInFrames),
      peakStartFrame,
      peakEndFrame: Math.min(timelineClip.durationInFrames - 1, peakStartFrame + holdFrames),
      endFrame: Math.min(timelineClip.durationInFrames - 1, peakStartFrame + holdFrames + rampOutFrames),
      scale: keyframe.scale,
      centerX: keyframe.centerX,
      centerY: keyframe.centerY,
    };
  });

  for (let index = 1; index < windows.length; index += 1) {
    const previous = windows[index - 1];
    const current = windows[index];
    if (current.startFrame <= previous.endFrame) {
      const midpoint = Math.max(previous.peakEndFrame + 2, Math.floor((previous.endFrame + current.startFrame) / 2));
      previous.endFrame = Math.max(previous.peakEndFrame + 1, midpoint);
      current.startFrame = Math.min(current.peakStartFrame, previous.endFrame + 1);
    }
  }

  return windows;
}

export function resolveCameraTransform(
  frame: number,
  windows: ScreenDemoCameraWindow[],
  viewport: { width: number; height: number },
): { scale: number; offsetX: number; offsetY: number } {
  const activeWindow = windows.find((window) => frame >= window.startFrame && frame <= window.endFrame);
  if (!activeWindow) {
    return {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const scale = resolveWindowScale(frame, activeWindow);
  const offsetX = ((viewport.width / 2) - activeWindow.centerX) * (scale - 1) * 0.6;
  const offsetY = ((viewport.height / 2) - activeWindow.centerY) * (scale - 1) * 0.6;

  return {
    scale,
    offsetX,
    offsetY,
  };
}

function resolveWindowScale(frame: number, window: ScreenDemoCameraWindow): number {
  if (frame <= window.peakStartFrame) {
    return interpolateWithinRange(frame, window.startFrame, window.peakStartFrame, 1, window.scale);
  }

  if (frame <= window.peakEndFrame) {
    return window.scale;
  }

  return interpolateWithinRange(frame, window.peakEndFrame, window.endFrame, window.scale, 1);
}

function interpolateWithinRange(
  frame: number,
  startFrame: number,
  endFrame: number,
  startValue: number,
  endValue: number,
): number {
  if (endFrame <= startFrame) {
    return endValue;
  }

  const progress = clamp((frame - startFrame) / (endFrame - startFrame), 0, 1);
  return startValue + (endValue - startValue) * progress;
}

function msToFrames(durationMs: number, fps: number): number {
  return Math.round((Math.max(durationMs, 0) / 1000) * fps);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
