import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export interface HarnessCaptureStageResult {
  projectDir: string;
  outputVideoPath: string;
  recordingPath: string;
  momentsPath: string;
  editConfigPath: string;
  renderPropsPath: string;
}

export async function runHarnessCaptureStage(input: {
  runDir: string;
  rootDir: string;
}): Promise<HarnessCaptureStageResult> {
  const recordingPlanPath = path.join(input.runDir, "recording-plan.json");
  if (!fs.existsSync(recordingPlanPath)) {
    throw new Error(`Recording plan not found: ${recordingPlanPath}`);
  }

  const recordingPlan = JSON.parse(fs.readFileSync(recordingPlanPath, "utf8")) as {
    repoUrls: string[];
  };
  if (!Array.isArray(recordingPlan.repoUrls) || recordingPlan.repoUrls.length === 0) {
    throw new Error("Recording plan did not contain any repo URLs.");
  }

  const scriptPath = path.join(input.rootDir, "scripts", "capture-live-playwright-demo.ts");
  const tsxCliPath = path.join(input.rootDir, "node_modules", "tsx", "dist", "cli.mjs");
  const args = [
    tsxCliPath,
    scriptPath,
    "--start-delay-ms=400",
    "--between-tabs-ms=150",
    `--recording-plan-path=${recordingPlanPath}`,
    `--audio-manifest-path=${path.join(input.runDir, "audio-manifest.json")}`,
  ];
  for (const repoUrl of recordingPlan.repoUrls) {
    args.push(`--repo-url=${repoUrl}`);
  }

  const output = execFileSync(process.execPath, args, {
    cwd: input.rootDir,
    encoding: "utf8",
  });

  const projectDir = extractLabeledValue(output, "Screen-demo project:");
  if (!projectDir) {
    throw new Error(`Could not determine screen-demo project directory from capture output.\n${output}`);
  }

  return {
    projectDir,
    outputVideoPath: path.join(projectDir, "demo.mp4"),
    recordingPath: path.join(projectDir, "recording.mp4"),
    momentsPath: path.join(projectDir, "moments.json"),
    editConfigPath: path.join(projectDir, "edit-config.json"),
    renderPropsPath: path.join(projectDir, "render-props.json"),
  };
}

function extractLabeledValue(output: string, label: string): string | null {
  const line = output.split(/\r?\n/).find((entry) => entry.trim().startsWith(label));
  return line ? line.slice(label.length).trim() : null;
}
