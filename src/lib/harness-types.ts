import { z } from "zod";

export const HarnessStageSchema = z.enum([
  "discovery",
  "research",
  "script",
  "audio",
  "recordingPlan",
  "browserDrive",
  "capture",
  "trim",
  "handoff",
  "finalAssembly",
]);

export const StageStatusSchema = z.enum([
  "pending",
  "running",
  "passed",
  "failed",
  "blocked",
  "readyForManual",
]);

export const HarnessRunModeSchema = z.enum([
  "daily-discovery",
  "manual-urls",
  "post-polish",
]);

export const ArtifactKindSchema = z.enum([
  "json",
  "markdown",
  "document",
  "audio",
  "video",
  "image",
  "log",
  "other",
]);

export const HarnessLogRecordSchema = z.object({
  time: z.string().datetime(),
  level: z.enum(["info", "warn", "error"]),
  message: z.string().min(1),
  stage: HarnessStageSchema.optional(),
});

export const StageRecordSchema = z.object({
  stage: HarnessStageSchema,
  status: StageStatusSchema,
  summary: z.string().optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  error: z.string().optional(),
});

export const ArtifactRecordSchema = z.object({
  id: z.string().min(1),
  stage: HarnessStageSchema,
  kind: ArtifactKindSchema,
  label: z.string().min(1),
  path: z.string().min(1),
  relativePath: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const HarnessRunSchema = z.object({
  id: z.string().min(1),
  mode: HarnessRunModeSchema,
  status: StageStatusSchema,
  rootDir: z.string().min(1),
  runDir: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  stages: z.array(StageRecordSchema).length(HarnessStageSchema.options.length),
  artifacts: z.array(ArtifactRecordSchema),
  log: z.array(HarnessLogRecordSchema),
});

export type HarnessStage = z.infer<typeof HarnessStageSchema>;
export type StageStatus = z.infer<typeof StageStatusSchema>;
export type HarnessRunMode = z.infer<typeof HarnessRunModeSchema>;
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>;
export type StageRecord = z.infer<typeof StageRecordSchema>;
export type ArtifactRecord = z.infer<typeof ArtifactRecordSchema>;
export type HarnessLogRecord = z.infer<typeof HarnessLogRecordSchema>;
export type HarnessRun = z.infer<typeof HarnessRunSchema>;

export function defaultStageStatuses(): StageRecord[] {
  return HarnessStageSchema.options.map((stage) => ({
    stage,
    status: "pending",
  }));
}

export function createInitialHarnessRun(input: {
  id: string;
  mode: HarnessRunMode;
  rootDir: string;
  runDir: string;
  nowIso?: string;
}): HarnessRun {
  const nowIso = input.nowIso ?? new Date().toISOString();
  return HarnessRunSchema.parse({
    id: input.id,
    mode: input.mode,
    status: "pending",
    rootDir: input.rootDir,
    runDir: input.runDir,
    createdAt: nowIso,
    updatedAt: nowIso,
    stages: defaultStageStatuses(),
    artifacts: [],
    log: [],
  });
}
