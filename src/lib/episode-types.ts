import { z } from "zod";

// ── Platform catalog snapshot ────────────────────────────────────────

export const CatalogSnapshotSchema = z.object({
  date: z.string(),
  totalSkills: z.number(),
  totalDownloads: z.number(),
  totalInstalls: z.number(),
  totalStars: z.number(),
});
export type CatalogSnapshot = z.infer<typeof CatalogSnapshotSchema>;

// ── OpenClaw GitHub project health ───────────────────────────────────

export const OpenClawProjectSchema = z.object({
  repo: z.string(),
  date: z.string(),
  stars: z.number(),
  forks: z.number(),
  openIssues: z.number(),
  openPrs: z.number(),
  watchers: z.number(),
  weeklyCommits: z.number(),
  latestRelease: z.string(),
});
export type OpenClawProject = z.infer<typeof OpenClawProjectSchema>;

// ── Per-skill history point ──────────────────────────────────────────

export const SkillHistorySchema = z.object({
  date: z.string(),
  downloads: z.number(),
  stars: z.number(),
  installsAllTime: z.number(),
  installsCurrent: z.number(),
  comments: z.number(),
});
export type SkillHistory = z.infer<typeof SkillHistorySchema>;

export const FocusCueSchema = z.object({
  label: z.string(),
  selector: z.string().optional(),
  timestampMs: z.number(),
  normalizedX: z.number(),
  normalizedY: z.number(),
  note: z.string().optional(),
});
export type FocusCue = z.infer<typeof FocusCueSchema>;

// ── Skill data from SkillMetricScraper ───────────────────────────────

export const SkillDataSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  summary: z.string(),
  author: z.string(),
  downloads: z.number(),
  stars: z.number(),
  installsCurrent: z.number(),
  installsAllTime: z.number(),
  clawhubUrl: z.string(),
  createdAt: z.union([z.string(), z.number(), z.null()]),
  track: z.enum(["mover", "rocket"]),
  rank: z.number(),
  /** Voice-ready narration script text */
  script: z.string(),

  // Delta metrics (computed by scraper)
  /** Download count change over measurement window */
  downloadsDelta: z.number().optional(),
  /** Star count change over measurement window */
  starsDelta: z.number().optional(),
  /** Install count change over measurement window */
  installsDelta: z.number().optional(),
  /** Percentage growth rate */
  pctIncrease: z.number().optional(),
  /** Weighted composite momentum score (0-1) */
  score: z.number().optional(),
  /** Per-day history snapshots */
  history: z.array(SkillHistorySchema).optional(),

  // Pre-render asset paths (relative to public/)
  clipPath: z.string().optional(),
  screenshotPath: z.string().optional(),
  /** Height of full-page screenshot in pixels (for scroll animation) */
  screenshotHeight: z.number().optional(),
  audioPath: z.string().optional(),
  /** Measured audio duration in milliseconds */
  audioDurationMs: z.number().optional(),
  /** Optional cue points for smarter cursor motion / zoom focus */
  focusCues: z.array(FocusCueSchema).optional(),
});
export type SkillData = z.infer<typeof SkillDataSchema>;

// ── Episode manifest ─────────────────────────────────────────────────

export const EpisodeDataSchema = z.object({
  episodeNumber: z.number(),
  weekLabel: z.string(),
  generatedAt: z.string(),
  fps: z.number().default(30),

  movers: z.array(SkillDataSchema),
  rockets: z.array(SkillDataSchema),

  /** Platform-wide catalog snapshots (2+ daily data points) */
  catalog: z.array(CatalogSnapshotSchema).optional(),
  /** OpenClaw GitHub project health metrics */
  openclawProject: z.array(OpenClawProjectSchema).optional(),

  // ── Scene narration scripts & audio ─────────────────────────────
  introScript: z.string().optional(),
  introAudioPath: z.string().optional(),
  introAudioDurationMs: z.number().optional(),

  pulseScript: z.string().optional(),
  pulseAudioPath: z.string().optional(),
  pulseAudioDurationMs: z.number().optional(),

  moversHeaderScript: z.string().optional(),
  moversHeaderAudioPath: z.string().optional(),
  moversHeaderAudioDurationMs: z.number().optional(),

  rocketsHeaderScript: z.string().optional(),
  rocketsHeaderAudioPath: z.string().optional(),
  rocketsHeaderAudioDurationMs: z.number().optional(),

  outroScript: z.string().optional(),
  outroAudioPath: z.string().optional(),
  outroAudioDurationMs: z.number().optional(),

  /** Path to background music file (relative to public/) */
  backgroundMusicPath: z.string().optional(),
  /** Background music volume (0-1, default 0.15) */
  backgroundMusicVolume: z.number().default(0.15),

  // Timing (frames) — used as fallback when no audio
  introDurationFrames: z.number().default(150),
  /** Ecosystem pulse dashboard duration */
  pulseDurationFrames: z.number().default(180),
  sectionHeaderDurationFrames: z.number().default(90),
  outroDurationFrames: z.number().default(150),
  /** Fallback duration per skill when no audio */
  defaultSkillDurationFrames: z.number().default(240),
  transitionDurationFrames: z.number().default(15),
});
export type EpisodeData = z.infer<typeof EpisodeDataSchema>;

// Composition props = episode data
export const SkillsWeeklyPropsSchema = EpisodeDataSchema;
export type SkillsWeeklyProps = z.infer<typeof SkillsWeeklyPropsSchema>;
