import { z } from "zod";

// ── Telemetry from Chrome extension ──────────────────────────────────

export const CursorPointSchema = z.object({
  /** Frame number (0-indexed at recording fps) */
  frame: z.number(),
  /** Normalized X position (0-1) */
  x: z.number(),
  /** Normalized Y position (0-1) */
  y: z.number(),
  /** Whether a click occurred at this point */
  clicked: z.boolean().optional(),
  /** Original timestamp (ms since epoch) */
  t: z.number().optional(),
});
export type CursorPoint = z.infer<typeof CursorPointSchema>;

export const ZoomEventSchema = z.object({
  /** Frame where zoom-in begins */
  startFrame: z.number(),
  /** Frame where zoom-out begins */
  endFrame: z.number(),
  /** Normalized focus X (0-1) — center of zoom */
  focusX: z.number(),
  /** Normalized focus Y (0-1) — center of zoom */
  focusY: z.number(),
  /** Target zoom scale (e.g. 2.0 for 2x zoom) */
  scale: z.number(),
});
export type ZoomEvent = z.infer<typeof ZoomEventSchema>;

// ── Telemetry file format ────────────────────────────────────────────

export const TelemetrySchema = z.object({
  fps: z.number(),
  durationMs: z.number(),
  totalFrames: z.number(),
  cursor: z.array(CursorPointSchema),
  zoomEvents: z.array(ZoomEventSchema),
});
export type Telemetry = z.infer<typeof TelemetrySchema>;

// ── Composition props ────────────────────────────────────────────────

export const RecordingPropsSchema = z.object({
  /** Path to the raw recording video */
  videoSrc: z.string(),
  /** Cursor telemetry data */
  cursorData: z.array(CursorPointSchema),
  /** Zoom events (auto-detected or manually edited) */
  zoomEvents: z.array(ZoomEventSchema),
  /** CSS background value (gradient, color, or url()) */
  background: z.string().default("linear-gradient(135deg, #667eea 0%, #764ba2 100%)"),
  /** Padding around the floating window (px) */
  padding: z.number().default(48),
  /** Border radius of the floating window (px) */
  borderRadius: z.number().default(12),
  /** Cursor size multiplier */
  cursorSize: z.number().default(1.0),
  /** Whether to show the emulated cursor */
  cursorEnabled: z.boolean().default(true),
});
export type RecordingProps = z.infer<typeof RecordingPropsSchema>;

// ── Wallpaper presets ────────────────────────────────────────────────

export const WALLPAPER_PRESETS: Record<string, string> = {
  "midnight": "linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b4e 100%)",
  "dark-slate": "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  "purple-haze": "linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #764ba2 100%)",
  "deep-ocean": "linear-gradient(135deg, #0d1117 0%, #0a2540 50%, #0d4880 100%)",
  "emerald": "linear-gradient(135deg, #0d1117 0%, #064e3b 50%, #065f46 100%)",
  "crimson": "linear-gradient(135deg, #1a0a0a 0%, #4a1025 50%, #6b1a3a 100%)",
  "charcoal": "linear-gradient(135deg, #111111 0%, #1e1e1e 50%, #2a2a2a 100%)",
  "nebula": "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
};
