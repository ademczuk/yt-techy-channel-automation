import React from "react";
import { AbsoluteFill, Audio, Series, staticFile, useVideoConfig } from "remotion";
import { IntroScene } from "../scenes/IntroScene";
import { EcosystemPulseScene } from "../scenes/EcosystemPulseScene";
import { SectionHeaderScene } from "../scenes/SectionHeaderScene";
import { SkillScene } from "../scenes/SkillScene";
import { OutroScene } from "../scenes/OutroScene";
import { ProgressBar } from "../components/ProgressBar";
import { WALLPAPER_PRESETS } from "../lib/types";
import type { SkillsWeeklyProps, SkillData } from "../lib/episode-types";

const WALLPAPER_KEYS = Object.keys(WALLPAPER_PRESETS);

/** Compute frames for a skill (audio-driven or fixed fallback) */
function skillFrames(skill: SkillData, fps: number, fallback: number): number {
  if (skill.audioDurationMs) {
    return Math.ceil((skill.audioDurationMs / 1000 + 1) * fps);
  }
  return fallback;
}

/** Compute frames from audio duration or use fallback */
function audioDrivenFrames(
  audioDurationMs: number | undefined,
  fps: number,
  fallback: number,
  padding: number = 1,
): number {
  if (audioDurationMs) {
    return Math.ceil((audioDurationMs / 1000 + padding) * fps);
  }
  return fallback;
}

/**
 * Main Skills Weekly composition.
 *
 * Sequences scenes via Series:
 *   Intro → Ecosystem Pulse → Movers Header → Movers × N →
 *   Rockets Header → Rockets × N → Outro
 *
 * All scene durations are audio-driven when narration exists.
 */
export const SkillsWeekly: React.FC<SkillsWeeklyProps> = (props) => {
  const {
    episodeNumber,
    weekLabel,
    movers,
    rockets,
    catalog,
    openclawProject,
    fps,
    introDurationFrames,
    pulseDurationFrames,
    sectionHeaderDurationFrames,
    outroDurationFrames,
    defaultSkillDurationFrames,
    backgroundMusicPath,
    backgroundMusicVolume,
    // Scene narration
    introAudioPath,
    introAudioDurationMs,
    pulseAudioPath,
    pulseAudioDurationMs,
    moversHeaderAudioPath,
    moversHeaderAudioDurationMs,
    rocketsHeaderAudioPath,
    rocketsHeaderAudioDurationMs,
    outroAudioPath,
    outroAudioDurationMs,
  } = props;

  const allSkills = [...movers, ...rockets];
  const hasCatalogData = catalog && catalog.length > 0;

  // Compute catalog deltas for IntroScene
  const latestCatalog = hasCatalogData ? catalog[catalog.length - 1] : undefined;
  const prevCatalog =
    hasCatalogData && catalog.length > 1 ? catalog[0] : undefined;
  const catalogTotalSkills = latestCatalog?.totalSkills;
  const catalogSkillsDelta =
    latestCatalog && prevCatalog
      ? latestCatalog.totalSkills - prevCatalog.totalSkills
      : undefined;

  // Audio-driven durations with fallbacks
  const introFrames = audioDrivenFrames(introAudioDurationMs, fps, introDurationFrames);
  const pulseFrames = audioDrivenFrames(pulseAudioDurationMs, fps, pulseDurationFrames);
  const moversHeaderFrames = audioDrivenFrames(moversHeaderAudioDurationMs, fps, sectionHeaderDurationFrames);
  const rocketsHeaderFrames = audioDrivenFrames(rocketsHeaderAudioDurationMs, fps, sectionHeaderDurationFrames);
  const outroFrames = audioDrivenFrames(outroAudioDurationMs, fps, outroDurationFrames);

  // Compute total duration for ProgressBar
  const totalDuration =
    introFrames +
    (hasCatalogData ? pulseFrames : 0) +
    (movers.length > 0 ? moversHeaderFrames : 0) +
    movers.reduce(
      (sum, s) => sum + skillFrames(s, fps, defaultSkillDurationFrames),
      0,
    ) +
    (rockets.length > 0 ? rocketsHeaderFrames : 0) +
    rockets.reduce(
      (sum, s) => sum + skillFrames(s, fps, defaultSkillDurationFrames),
      0,
    ) +
    outroFrames;

  // Round-robin wallpaper index
  let wpIdx = 0;
  const nextWallpaper = (): string => {
    const key = WALLPAPER_KEYS[wpIdx % WALLPAPER_KEYS.length];
    wpIdx++;
    return WALLPAPER_PRESETS[key];
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d1117" }}>
      <Series>
        {/* ── Intro ─────────────────────────────────────── */}
        <Series.Sequence durationInFrames={introFrames} name="Intro">
          <IntroScene
            episodeNumber={episodeNumber}
            weekLabel={weekLabel}
            totalSkills={allSkills.length}
            catalogTotalSkills={catalogTotalSkills}
            catalogSkillsDelta={catalogSkillsDelta}
            audioPath={introAudioPath}
          />
        </Series.Sequence>

        {/* ── Ecosystem Pulse (only when catalog data available) ── */}
        {hasCatalogData && (
          <Series.Sequence
            durationInFrames={pulseFrames}
            name="Ecosystem Pulse"
          >
            <EcosystemPulseScene
              catalog={catalog}
              openclawProject={openclawProject}
              audioPath={pulseAudioPath}
            />
          </Series.Sequence>
        )}

        {/* ── Movers section ────────────────────────────── */}
        {movers.length > 0 && (
          <Series.Sequence
            durationInFrames={moversHeaderFrames}
            name="Movers Header"
          >
            <SectionHeaderScene
              title="TOP MOVERS"
              subtitle="Established skills trending this week"
              background={nextWallpaper()}
              audioPath={moversHeaderAudioPath}
            />
          </Series.Sequence>
        )}

        {movers.map((skill) => (
          <Series.Sequence
            key={`mover-${skill.slug}`}
            durationInFrames={skillFrames(
              skill,
              fps,
              defaultSkillDurationFrames,
            )}
            name={`#${skill.rank} ${skill.displayName}`}
          >
            <SkillScene skill={skill} background={nextWallpaper()} />
          </Series.Sequence>
        ))}

        {/* ── Rockets section ───────────────────────────── */}
        {rockets.length > 0 && (
          <Series.Sequence
            durationInFrames={rocketsHeaderFrames}
            name="Rockets Header"
          >
            <SectionHeaderScene
              title="NEW THIS WEEK"
              subtitle="Brand new skills showing early traction"
              background={nextWallpaper()}
              audioPath={rocketsHeaderAudioPath}
            />
          </Series.Sequence>
        )}

        {rockets.map((skill) => (
          <Series.Sequence
            key={`rocket-${skill.slug}`}
            durationInFrames={skillFrames(
              skill,
              fps,
              defaultSkillDurationFrames,
            )}
            name={`New: ${skill.displayName}`}
          >
            <SkillScene skill={skill} background={nextWallpaper()} />
          </Series.Sequence>
        ))}

        {/* ── Outro ─────────────────────────────────────── */}
        <Series.Sequence durationInFrames={outroFrames} name="Outro">
          <OutroScene episodeNumber={episodeNumber} audioPath={outroAudioPath} />
        </Series.Sequence>
      </Series>

      {/* Progress bar overlays everything */}
      <ProgressBar totalFrames={totalDuration} />

      {/* Background music — loops for entire duration, low volume under narration */}
      {backgroundMusicPath && (
        <Audio
          src={staticFile(backgroundMusicPath)}
          volume={backgroundMusicVolume ?? 0.12}
          loop
        />
      )}
    </AbsoluteFill>
  );
};
