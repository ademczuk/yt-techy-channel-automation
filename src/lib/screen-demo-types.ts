import { z } from "zod";

export const BrowseActionSchema = z.enum([
  "navigate",
  "wait",
  "hover",
  "click",
  "type",
  "scroll",
  "goBack",
]);

export const BrowseStepSchema = z.object({
  action: BrowseActionSchema,
  label: z.string().min(1),
  url: z.string().url().optional(),
  selector: z.string().optional(),
  selectorCandidates: z.array(z.string()).optional(),
  text: z.string().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  deltaY: z.number().int().optional(),
  smooth: z.boolean().optional(),
  circleCount: z.number().int().min(1).max(2).optional(),
  targetKind: z.enum(["header", "description", "readme", "link", "video", "input"]).optional(),
  optional: z.boolean().optional(),
  scriptLine: z.string().optional(),
});

export const NarrationBeatSchema = z.object({
  url: z.string().url(),
  line: z.string().min(1),
  focusLabel: z.string().min(1),
  focusSelectors: z.array(z.string()).min(1),
  circleCount: z.number().int().min(1).max(2),
});

export const BrowsePlanSchema = z.object({
  version: z.literal(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  urls: z.array(z.string().url()).min(1),
  narration: z.array(NarrationBeatSchema).min(1),
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  steps: z.array(BrowseStepSchema).min(1),
});

export const DemoMomentSchema = z.object({
  timeMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative().optional(),
  action: BrowseActionSchema,
  label: z.string().min(1),
  selector: z.string().optional(),
  url: z.string().url().optional(),
  bounds: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});

export const DemoClipSchema = z.object({
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  timelineDurationMs: z.number().int().positive().optional(),
  labels: z.array(z.string()).min(1),
});

export const CameraKeyframeSchema = z.object({
  timeMs: z.number().int().nonnegative(),
  scale: z.number().positive(),
  centerX: z.number(),
  centerY: z.number(),
  label: z.string().min(1),
});

export const EditConfigSchema = z.object({
  playbackRate: z.number().positive(),
  fps: z.number().int().positive(),
  clips: z.array(DemoClipSchema),
  camera: z.array(CameraKeyframeSchema),
  backgroundMode: z.enum(["dark", "light"]),
});

export type BrowseStep = z.infer<typeof BrowseStepSchema>;
export type NarrationBeat = z.infer<typeof NarrationBeatSchema>;
export type BrowsePlan = z.infer<typeof BrowsePlanSchema>;
export type DemoMoment = z.infer<typeof DemoMomentSchema>;
export type DemoClip = z.infer<typeof DemoClipSchema>;
export type CameraKeyframe = z.infer<typeof CameraKeyframeSchema>;
export type EditConfig = z.infer<typeof EditConfigSchema>;
