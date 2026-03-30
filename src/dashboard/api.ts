import path from "node:path";
import {
  appendHarnessArtifacts,
  appendHarnessLog,
  createHarnessRunStorage,
  findHarnessRunById,
  listHarnessArtifacts,
  listHarnessRuns,
  setHarnessStageStatus,
} from "../lib/harness-storage";
import { runGitHubDiscoveryStage, type GitHubDiscoveryStageResult } from "../lib/harness-discovery";
import { runGitHubResearchStage, type GitHubResearchStageResult } from "../lib/harness-research";
import { runHarnessScriptStage, type HarnessScriptStageResult } from "../lib/harness-script";
import { runHarnessAudioStage, type HarnessAudioStageResult } from "../lib/harness-audio";
import { runHarnessRecordingPlanStage, type HarnessRecordingPlanStageResult } from "../lib/harness-recording-plan";
import { runHarnessCaptureStage, type HarnessCaptureStageResult } from "../lib/harness-capture";
import type { HarnessRun, HarnessRunMode, HarnessStage } from "../lib/harness-types";

export interface DashboardApi {
  createRun(input: { mode: HarnessRunMode }): ReturnType<typeof createHarnessRunStorage>["run"];
  listRuns(): ReturnType<typeof listHarnessRuns>;
  getRun(runId: string): ReturnType<typeof findHarnessRunById>;
  listArtifacts(runId: string): ReturnType<typeof listHarnessArtifacts>;
  runDiscovery(runId: string): Promise<ReturnType<typeof findHarnessRunById>>;
  runResearch(runId: string): Promise<ReturnType<typeof findHarnessRunById>>;
  runScript(runId: string): Promise<ReturnType<typeof findHarnessRunById>>;
  runAudio(runId: string): Promise<ReturnType<typeof findHarnessRunById>>;
  runRecordingPlan(runId: string): Promise<ReturnType<typeof findHarnessRunById>>;
  runCapture(runId: string): Promise<ReturnType<typeof findHarnessRunById>>;
  runPipeline(runId: string): Promise<ReturnType<typeof findHarnessRunById>>;
}

export function createDashboardApi(input: {
  rootDir: string;
  runGitHubDiscovery?: (input: { runDir: string }) => Promise<GitHubDiscoveryStageResult>;
  runGitHubResearch?: (input: { runDir: string }) => Promise<GitHubResearchStageResult>;
  runHarnessScript?: (input: { runDir: string }) => Promise<HarnessScriptStageResult>;
  runHarnessAudio?: (input: { runDir: string }) => Promise<HarnessAudioStageResult>;
  runHarnessRecordingPlan?: (input: { runDir: string }) => Promise<HarnessRecordingPlanStageResult>;
  runHarnessCapture?: (input: { runDir: string; rootDir: string }) => Promise<HarnessCaptureStageResult>;
}): DashboardApi {
  const runGitHubDiscovery = input.runGitHubDiscovery ?? (({ runDir }) =>
    runGitHubDiscoveryStage({
      runDir,
      limit: 12,
    }));
  const runGitHubResearch = input.runGitHubResearch ?? (({ runDir }) =>
    runGitHubResearchStage({
      runDir,
      selectionCount: 3,
    }));
  const runHarnessScript = input.runHarnessScript ?? (({ runDir }) =>
    runHarnessScriptStage({
      runDir,
      titlePrefix: "Code Search",
    }));
  const runHarnessAudio = input.runHarnessAudio ?? (({ runDir }) =>
    runHarnessAudioStage({
      runDir,
    }));
  const runHarnessRecordingPlan = input.runHarnessRecordingPlan ?? (({ runDir }) =>
    runHarnessRecordingPlanStage({
      runDir,
    }));
  const runHarnessCapture = input.runHarnessCapture ?? (({ runDir, rootDir }) =>
    runHarnessCaptureStage({
      runDir,
      rootDir,
    }));

  const api: DashboardApi = {
    createRun: ({ mode }) => createHarnessRunStorage({
      rootDir: input.rootDir,
      mode,
    }).run,
    listRuns: () => listHarnessRuns(input.rootDir),
    getRun: (runId) => findHarnessRunById(input.rootDir, runId),
    listArtifacts: (runId) => {
      const run = requireRun(input.rootDir, runId);
      return listHarnessArtifacts(run.runDir);
    },
    runDiscovery: async (runId) => {
      const run = requireRun(input.rootDir, runId);

      setHarnessStageStatus(run.runDir, "discovery", {
        status: "running",
        startedAt: new Date().toISOString(),
        summary: "Fetching GitHub candidates",
      });
      appendHarnessLog(run.runDir, {
        time: new Date().toISOString(),
        level: "info",
        stage: "discovery",
        message: "Discovery stage started",
      });

      try {
        const result = await runGitHubDiscovery({ runDir: run.runDir });
        appendHarnessArtifacts(run.runDir, [
          {
            id: "discovery-candidates",
            stage: "discovery",
            kind: "json",
            label: "Discovery Candidates",
            path: result.outputPath,
          },
          {
            id: "discovery-summary",
            stage: "discovery",
            kind: "markdown",
            label: "Discovery Summary",
            path: result.summaryPath,
          },
        ]);
        setHarnessStageStatus(run.runDir, "discovery", {
          status: "passed",
          endedAt: new Date().toISOString(),
          summary: `Selected ${result.candidates.length} candidates`,
        });
        appendHarnessLog(run.runDir, {
          time: new Date().toISOString(),
          level: "info",
          stage: "discovery",
          message: `Discovery selected ${result.candidates.length} candidates`,
        });
      } catch (error) {
        failStage(run, "discovery", error, "Discovery failed");
        throw error;
      }

      return findHarnessRunById(input.rootDir, runId);
    },
    runResearch: async (runId) => {
      const run = requireRun(input.rootDir, runId);

      setHarnessStageStatus(run.runDir, "research", {
        status: "running",
        startedAt: new Date().toISOString(),
        summary: "Building research shortlist",
      });
      appendHarnessLog(run.runDir, {
        time: new Date().toISOString(),
        level: "info",
        stage: "research",
        message: "Research stage started",
      });

      try {
        const result = await runGitHubResearch({ runDir: run.runDir });
        appendHarnessArtifacts(run.runDir, [
          {
            id: "research-shortlist",
            stage: "research",
            kind: "json",
            label: "Research Shortlist",
            path: result.shortlistPath,
          },
          {
            id: "research-brief",
            stage: "research",
            kind: "markdown",
            label: "Research Brief",
            path: result.briefPath,
          },
        ]);
        setHarnessStageStatus(run.runDir, "research", {
          status: "passed",
          endedAt: new Date().toISOString(),
          summary: `Prepared ${result.selected.length} research candidates`,
        });
        appendHarnessLog(run.runDir, {
          time: new Date().toISOString(),
          level: "info",
          stage: "research",
          message: `Research brief written for ${result.selected.length} candidates`,
        });
      } catch (error) {
        failStage(run, "research", error, "Research failed");
        throw error;
      }

      return findHarnessRunById(input.rootDir, runId);
    },
    runScript: async (runId) => {
      const run = requireRun(input.rootDir, runId);
      return runStage({
        rootDir: input.rootDir,
        run,
        stage: "script",
        startSummary: "Building script packet",
        execute: async () => {
          const result = await runHarnessScript({ runDir: run.runDir });
          appendHarnessArtifacts(run.runDir, [
            { id: "script-prompt", stage: "script", kind: "json", label: "Script Prompt Packet", path: result.promptPath },
            { id: "script-packet", stage: "script", kind: "json", label: "Script Packet", path: result.packetPath },
            { id: "script-markdown", stage: "script", kind: "markdown", label: "Script Markdown", path: result.scriptPath },
          ]);
          return `Prepared scripts for ${result.packet.repos.length} repos`;
        },
      });
    },
    runAudio: async (runId) => {
      const run = requireRun(input.rootDir, runId);
      return runStage({
        rootDir: input.rootDir,
        run,
        stage: "audio",
        startSummary: "Generating narration audio",
        execute: async () => {
          const result = await runHarnessAudio({ runDir: run.runDir });
          appendHarnessArtifacts(run.runDir, [
            { id: "audio-manifest", stage: "audio", kind: "json", label: "Audio Manifest", path: result.manifestPath },
          ]);
          return `Generated ${result.manifest.segments.length} audio segments`;
        },
      });
    },
    runRecordingPlan: async (runId) => {
      const run = requireRun(input.rootDir, runId);
      return runStage({
        rootDir: input.rootDir,
        run,
        stage: "recordingPlan",
        startSummary: "Building recording plan",
        execute: async () => {
          const result = await runHarnessRecordingPlan({ runDir: run.runDir });
          appendHarnessArtifacts(run.runDir, [
            { id: "recording-plan", stage: "recordingPlan", kind: "json", label: "Recording Plan", path: result.planPath },
          ]);
          return `Prepared capture order for ${result.plan.repoUrls.length} repos`;
        },
      });
    },
    runCapture: async (runId) => {
      const run = requireRun(input.rootDir, runId);

      setHarnessStageStatus(run.runDir, "browserDrive", {
        status: "running",
        startedAt: new Date().toISOString(),
        summary: "Driving the local browser",
      });
      appendHarnessLog(run.runDir, {
        time: new Date().toISOString(),
        level: "info",
        stage: "browserDrive",
        message: "Local browser drive started",
      });

      return runStage({
        rootDir: input.rootDir,
        run,
        stage: "capture",
        startSummary: "Capturing and trimming browser demo",
        execute: async () => {
          const result = await runHarnessCapture({ runDir: run.runDir, rootDir: input.rootDir });
          appendHarnessArtifacts(run.runDir, [
            { id: "capture-demo", stage: "capture", kind: "video", label: "Trimmed Demo", path: result.outputVideoPath },
            { id: "capture-recording", stage: "capture", kind: "video", label: "Raw Recording", path: result.recordingPath },
            { id: "capture-moments", stage: "capture", kind: "json", label: "Capture Moments", path: result.momentsPath },
            { id: "capture-edit-config", stage: "capture", kind: "json", label: "Capture Edit Config", path: result.editConfigPath },
            { id: "capture-render-props", stage: "capture", kind: "json", label: "Capture Render Props", path: result.renderPropsPath },
          ]);
          setHarnessStageStatus(run.runDir, "browserDrive", {
            status: "passed",
            endedAt: new Date().toISOString(),
            summary: "Local browser drive completed",
          });
          setHarnessStageStatus(run.runDir, "trim", {
            status: "passed",
            endedAt: new Date().toISOString(),
            summary: "Trimmed demo output rendered",
          });
          setHarnessStageStatus(run.runDir, "handoff", {
            status: "readyForManual",
            endedAt: new Date().toISOString(),
            summary: "Trimmed MP4 ready for Cursorful or Recordly polish",
          });
          appendHarnessLog(run.runDir, {
            time: new Date().toISOString(),
            level: "info",
            stage: "handoff",
            message: "Trimmed MP4 ready for manual polish",
          });
          return `Captured demo at ${path.basename(result.outputVideoPath)}`;
        },
      });
    },
    runPipeline: async (runId) => {
      await api.runDiscovery(runId);
      await api.runResearch(runId);
      await api.runScript(runId);
      await api.runAudio(runId);
      await api.runRecordingPlan(runId);
      await api.runCapture(runId);
      return findHarnessRunById(input.rootDir, runId);
    },
  };

  return api;
}

export function resolveDashboardStaticPath(rootDir: string, requestPath: string): string {
  const relativePath = requestPath === "/" ? "/index.html" : requestPath;
  return path.join(rootDir, "dashboard", relativePath.replace(/^\/+/, ""));
}

function requireRun(rootDir: string, runId: string) {
  const run = findHarnessRunById(rootDir, runId);
  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }
  return run;
}

async function runStage(input: {
  rootDir: string;
  run: HarnessRun;
  stage: "script" | "audio" | "recordingPlan" | "capture";
  startSummary: string;
  execute: () => Promise<string>;
}) {
  setHarnessStageStatus(input.run.runDir, input.stage, {
    status: "running",
    startedAt: new Date().toISOString(),
    summary: input.startSummary,
  });
  appendHarnessLog(input.run.runDir, {
    time: new Date().toISOString(),
    level: "info",
    stage: input.stage,
    message: `${input.stage} stage started`,
  });

  try {
    const summary = await input.execute();
    setHarnessStageStatus(input.run.runDir, input.stage, {
      status: "passed",
      endedAt: new Date().toISOString(),
      summary,
    });
    appendHarnessLog(input.run.runDir, {
      time: new Date().toISOString(),
      level: "info",
      stage: input.stage,
      message: summary,
    });
    return findHarnessRunById(input.rootDir, input.run.id);
  } catch (error) {
    failStage(input.run, input.stage, error, `${input.stage} failed`);
    throw error;
  }
}

function failStage(
  run: HarnessRun,
  stage: HarnessStage,
  error: unknown,
  summary: string,
) {
  setHarnessStageStatus(run.runDir, stage, {
    status: "failed",
    endedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
    summary,
  });
  appendHarnessLog(run.runDir, {
    time: new Date().toISOString(),
    level: "error",
    stage,
    message: error instanceof Error ? error.message : String(error),
  });
}
