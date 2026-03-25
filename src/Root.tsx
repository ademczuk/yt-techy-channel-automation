import React from "react";
import { Composition } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { SkillsWeekly } from "./compositions/SkillsWeekly";
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
  return (
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
  );
};
