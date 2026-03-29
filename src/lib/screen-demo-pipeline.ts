import fs from "fs";
import path from "path";
import {
  buildDraftBrowsePlan,
  buildEditConfig,
  buildScreenDemoScript,
  createScreenDemoProject,
  writeJsonFile,
  type ScreenDemoProject,
} from "./screen-demo-harness";
import { renderScreenDemoFromProps } from "./screen-demo-render";
import {
  ensureSteelApiKey,
  runSteelRecording,
  type RunSteelRecordingInput,
  type SteelRecordingResult,
} from "./screen-demo-steel";
import type { BrowsePlan, EditConfig, NarrationBeat } from "./screen-demo-types";

export interface RunScreenDemoPipelineInput {
  rootDir: string;
  prompt: string;
  backgroundMode?: "dark" | "light";
  ensureApiKey?: () => string;
  createProject?: (input: {
    rootDir: string;
    instructions: string;
    now?: Date;
  }) => ScreenDemoProject;
  buildPlan?: (prompt: string) => BrowsePlan;
  buildScript?: (narration: NarrationBeat[]) => string;
  runRecording?: (input: RunSteelRecordingInput) => Promise<SteelRecordingResult>;
  buildEdit?: (
    moments: SteelRecordingResult["moments"],
    recordingDurationMs: number,
    backgroundMode?: "dark" | "light",
  ) => EditConfig;
  renderScreenDemo?: (input: {
    rootDir: string;
    propsPath: string;
    outputPath: string;
  }) => Promise<void>;
}

export interface RunScreenDemoPipelineResult {
  project: ScreenDemoProject;
  browsePlan: BrowsePlan;
  editConfig: EditConfig;
  recording: SteelRecordingResult;
  publicRecordingPath: string;
}

export async function runScreenDemoPipeline(
  input: RunScreenDemoPipelineInput,
): Promise<RunScreenDemoPipelineResult> {
  const createProject = input.createProject ?? createScreenDemoProject;
  const buildPlan = input.buildPlan ?? buildDraftBrowsePlan;
  const buildScript = input.buildScript ?? buildScreenDemoScript;
  const ensureApiKeyFn = input.ensureApiKey ?? ensureSteelApiKey;
  const runRecording = input.runRecording ?? runSteelRecording;
  const buildEdit = input.buildEdit ?? buildEditConfig;
  const renderScreenDemo = input.renderScreenDemo ?? renderScreenDemoFromProps;
  const backgroundMode = input.backgroundMode ?? "dark";

  const project = createProject({
    rootDir: input.rootDir,
    instructions: input.prompt,
  });

  const browsePlan = buildPlan(input.prompt);
  writeJsonFile(project.browsePlanPath, browsePlan);
  fs.writeFileSync(project.scriptPath, `${buildScript(browsePlan.narration)}\n`, "utf8");

  const apiKey = ensureApiKeyFn();
  const recording = await runRecording({
    apiKey,
    plan: browsePlan,
    projectDir: project.projectDir,
  });

  const recordingDurationMs = recording.rawDurationMs
    ?? Math.max(...recording.moments.map((moment) => moment.endMs ?? moment.timeMs), 0);
  const editConfig = buildEdit(recording.moments, recordingDurationMs, backgroundMode);
  const publicRecordingPath = syncRecordingIntoPublicDir({
    rootDir: input.rootDir,
    projectDir: project.projectDir,
    recordingPath: recording.recordingPath,
  });

  writeJsonFile(project.cameraConfigPath, editConfig.camera);
  writeJsonFile(project.editConfigPath, editConfig);
  writeJsonFile(project.renderPropsPath, {
    recordingSrc: `/screen-demos/${path.basename(project.projectDir)}/recording.mp4`,
    clips: editConfig.clips,
    camera: editConfig.camera,
    fps: editConfig.fps,
    backgroundMode: editConfig.backgroundMode,
    playbackRate: editConfig.playbackRate,
    viewport: browsePlan.viewport,
  });

  await renderScreenDemo({
    rootDir: input.rootDir,
    propsPath: project.renderPropsPath,
    outputPath: project.outputVideoPath,
  });

  return {
    project,
    browsePlan,
    editConfig,
    recording,
    publicRecordingPath,
  };
}

function syncRecordingIntoPublicDir(input: {
  rootDir: string;
  projectDir: string;
  recordingPath: string;
}): string {
  const publicRecordingDir = path.join(
    input.rootDir,
    "public",
    "screen-demos",
    path.basename(input.projectDir),
  );
  fs.mkdirSync(publicRecordingDir, { recursive: true });

  const publicRecordingPath = path.join(publicRecordingDir, "recording.mp4");
  fs.copyFileSync(input.recordingPath, publicRecordingPath);
  return publicRecordingPath;
}
