import React from "react";
import { Composition } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { SkillsWeekly } from "./compositions/SkillsWeekly";
import { ScreenDemoComposition } from "./compositions/ScreenDemoComposition";
import { calculateScreenDemoDurationInFrames } from "./lib/screen-demo-remotion";
import { DEFAULT_EPISODE_DATA } from "./lib/default-episode";
import {
  SkillsWeeklyPropsSchema,
  type SkillsWeeklyProps,
} from "./lib/episode-types";

const calculateSkillsWeeklyMetadata: CalculateMetadataFunction<
  SkillsWeeklyProps
> = async ({ props }) => {
  const {
    fps,
    movers,
    rockets,
    catalog,
    introDurationFrames,
    pulseDurationFrames,
    sectionHeaderDurationFrames,
    outroDurationFrames,
    defaultSkillDurationFrames,
    introAudioDurationMs,
    pulseAudioDurationMs,
    moversHeaderAudioDurationMs,
    rocketsHeaderAudioDurationMs,
    outroAudioDurationMs,
  } = props;

  const adFrames = (ms: number | undefined, fallback: number, padding = 1) =>
    ms ? Math.ceil((ms / 1000 + padding) * fps) : fallback;

  const skillFrames = (s: { audioDurationMs?: number }) =>
    s.audioDurationMs
      ? Math.ceil((s.audioDurationMs / 1000 + 1) * fps)
      : defaultSkillDurationFrames;

  const hasCatalogData = catalog && catalog.length > 0;

  const total =
    adFrames(introAudioDurationMs, introDurationFrames) +
    (hasCatalogData ? adFrames(pulseAudioDurationMs, pulseDurationFrames) : 0) +
    (movers.length > 0
      ? adFrames(moversHeaderAudioDurationMs, sectionHeaderDurationFrames)
      : 0) +
    movers.reduce((sum, s) => sum + skillFrames(s), 0) +
    (rockets.length > 0
      ? adFrames(rocketsHeaderAudioDurationMs, sectionHeaderDurationFrames)
      : 0) +
    rockets.reduce((sum, s) => sum + skillFrames(s), 0) +
    adFrames(outroAudioDurationMs, outroDurationFrames);

  return {
    durationInFrames: total,
    fps,
    width: 1920,
    height: 1080,
  };
};

export const RemotionRoot: React.FC = () => {
  const calculateScreenDemoMetadata: CalculateMetadataFunction<{
    clips: Array<{ startMs: number; endMs: number; labels: string[]; timelineDurationMs?: number }>;
    audioTracks?: Array<{ startMs: number; durationMs?: number }>;
    visualOffsetMs?: number;
    fps: number;
    playbackRate: number;
  }> = async ({ props }) => {
    const audioEndMs = (props.audioTracks ?? []).reduce((maxMs, track) => {
      return Math.max(maxMs, (track.startMs ?? 0) + (track.durationMs ?? 0));
    }, 0);
    const visualDurationFrames = calculateScreenDemoDurationInFrames(
      props.clips ?? [],
      props.fps ?? 60,
      props.playbackRate ?? 4,
      props.visualOffsetMs ?? 0,
    );
    const audioDurationFrames = Math.ceil((audioEndMs / 1000) * (props.fps ?? 60));
    return {
      durationInFrames: Math.max(visualDurationFrames, audioDurationFrames, props.fps ?? 60),
      fps: props.fps ?? 60,
      width: 1920,
      height: 1080,
    };
  };

  return (
    <>
      <Composition
        id="SkillsWeekly"
        component={SkillsWeekly}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        schema={SkillsWeeklyPropsSchema}
        calculateMetadata={calculateSkillsWeeklyMetadata}
        defaultProps={DEFAULT_EPISODE_DATA}
      />
      <Composition
        id="ScreenDemo"
        component={ScreenDemoComposition}
        durationInFrames={600}
        fps={60}
        width={1920}
        height={1080}
        calculateMetadata={calculateScreenDemoMetadata}
        defaultProps={{
          recordingSrc: "runtime/placeholder.mp4",
          clips: [],
          camera: [],
          audioTracks: [],
          visualOffsetMs: 0,
          fps: 60,
          backgroundMode: "dark",
          playbackRate: 4,
          viewport: {
            width: 1920,
            height: 1080,
          },
        }}
      />
    </>
  );
};
