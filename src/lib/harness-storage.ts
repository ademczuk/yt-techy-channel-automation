import fs from "node:fs";
import path from "node:path";
import {
  createInitialHarnessRun,
  HarnessRunSchema,
  type ArtifactKind,
  type ArtifactRecord,
  type HarnessLogRecord,
  type HarnessRun,
  type HarnessRunMode,
  type HarnessStage,
  type StageRecord,
} from "./harness-types";

const RUN_FILE_NAME = "run.json";

export function createHarnessRunStorage(input: {
  rootDir: string;
  mode: HarnessRunMode;
  id?: string;
  now?: Date;
}): {
  run: HarnessRun;
  runDir: string;
  runPath: string;
} {
  const now = input.now ?? new Date();
  const stamp = toDateStamp(now);
  const id = input.id ?? `run-${toCompactTimestamp(now)}`;
  const runDir = path.join(input.rootDir, "runtime", "runs", stamp, id);
  const runPath = path.join(runDir, RUN_FILE_NAME);

  fs.mkdirSync(runDir, { recursive: true });
  const run = createInitialHarnessRun({
    id,
    mode: input.mode,
    rootDir: input.rootDir,
    runDir,
    nowIso: now.toISOString(),
  });

  writeHarnessRun(runPath, run);
  return { run, runDir, runPath };
}

export function readHarnessRun(runPath: string): HarnessRun {
  const raw = fs.readFileSync(runPath, "utf8");
  return HarnessRunSchema.parse(JSON.parse(raw));
}

export function writeHarnessRun(runPath: string, run: HarnessRun): void {
  fs.writeFileSync(runPath, `${JSON.stringify(HarnessRunSchema.parse(run), null, 2)}\n`, "utf8");
}

export function setHarnessStageStatus(
  runDir: string,
  stageName: HarnessStage,
  patch: Partial<Omit<StageRecord, "stage">>,
): HarnessRun {
  const runPath = path.join(runDir, RUN_FILE_NAME);
  const run = readHarnessRun(runPath);
  const nextUpdatedAt = patch.endedAt ?? new Date().toISOString();

  const stages = run.stages.map((stage) => {
    if (stage.stage !== stageName) {
      return stage;
    }

    return {
      ...stage,
      ...patch,
      stage: stage.stage,
    };
  });

  const nextRun = HarnessRunSchema.parse({
    ...run,
    status: deriveRunStatus(stages),
    updatedAt: nextUpdatedAt,
    stages,
  });

  writeHarnessRun(runPath, nextRun);
  return nextRun;
}

export function appendHarnessArtifacts(
  runDir: string,
  artifacts: Array<{
    id: string;
    stage: HarnessStage;
    kind: ArtifactKind;
    label: string;
    path: string;
    createdAt?: string;
  }>,
): HarnessRun {
  const runPath = path.join(runDir, RUN_FILE_NAME);
  const run = readHarnessRun(runPath);
  const nextArtifacts: ArtifactRecord[] = [
    ...run.artifacts,
    ...artifacts.map((artifact) => ({
      ...artifact,
      relativePath: path.relative(runDir, artifact.path).replace(/\\/g, "/"),
      createdAt: artifact.createdAt ?? new Date().toISOString(),
    })),
  ];

  const nextRun = HarnessRunSchema.parse({
    ...run,
    updatedAt: new Date().toISOString(),
    artifacts: nextArtifacts,
  });

  writeHarnessRun(runPath, nextRun);
  return nextRun;
}

export function appendHarnessLog(
  runDir: string,
  entry: HarnessLogRecord,
): HarnessRun {
  const runPath = path.join(runDir, RUN_FILE_NAME);
  const run = readHarnessRun(runPath);
  const nextRun = HarnessRunSchema.parse({
    ...run,
    updatedAt: entry.time,
    log: [...run.log, entry],
  });

  writeHarnessRun(runPath, nextRun);
  return nextRun;
}

export function listHarnessArtifacts(runDir: string): Array<{
  path: string;
  relativePath: string;
  size: number;
}> {
  const collected: Array<{ path: string; relativePath: string; size: number }> = [];
  walk(runDir, (entryPath) => {
    if (path.basename(entryPath) === RUN_FILE_NAME) {
      return;
    }

    const stats = fs.statSync(entryPath);
    if (!stats.isFile()) {
      return;
    }

    collected.push({
      path: entryPath,
      relativePath: path.relative(runDir, entryPath).replace(/\\/g, "/"),
      size: stats.size,
    });
  });

  return collected.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export function listHarnessRuns(rootDir: string): HarnessRun[] {
  const runsRoot = path.join(rootDir, "runtime", "runs");
  if (!fs.existsSync(runsRoot)) {
    return [];
  }

  const runs: HarnessRun[] = [];
  walk(runsRoot, (entryPath) => {
    if (path.basename(entryPath) !== RUN_FILE_NAME) {
      return;
    }
    runs.push(readHarnessRun(entryPath));
  });

  return runs.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function findHarnessRunById(rootDir: string, runId: string): HarnessRun | null {
  return listHarnessRuns(rootDir).find((run) => run.id === runId) ?? null;
}

function deriveRunStatus(stages: StageRecord[]): HarnessRun["status"] {
  if (stages.some((stage) => stage.status === "failed")) {
    return "failed";
  }

  if (stages.some((stage) => stage.status === "blocked")) {
    return "blocked";
  }

  if (stages.some((stage) => stage.status === "running")) {
    return "running";
  }

  if (stages.some((stage) => stage.status === "readyForManual")) {
    return "readyForManual";
  }

  if (stages.every((stage) => stage.status === "passed")) {
    return "passed";
  }

  return "pending";
}

function walk(directory: string, visit: (entryPath: string) => void): void {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath, visit);
      continue;
    }
    visit(entryPath);
  }
}

function toDateStamp(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function toCompactTimestamp(value: Date): string {
  return value.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}
