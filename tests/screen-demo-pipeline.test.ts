import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { runScreenDemoPipeline } from "../src/lib/screen-demo-pipeline";
import type { BrowsePlan } from "../src/lib/screen-demo-types";

test("runScreenDemoPipeline records and renders a trimmed demo output", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "screen-demo-pipeline-"));
  const projectDir = path.join(rootDir, "screen-demos", "demo-20260328-010203");
  const project = {
    slug: "demo",
    projectDir,
    promptPath: path.join(projectDir, "prompt.txt"),
    scriptPath: path.join(projectDir, "script.txt"),
    browsePlanPath: path.join(projectDir, "browse-plan.json"),
    sessionPath: path.join(projectDir, "session.json"),
    momentsPath: path.join(projectDir, "moments.json"),
    cameraConfigPath: path.join(projectDir, "camera-config.json"),
    editConfigPath: path.join(projectDir, "edit-config.json"),
    renderPropsPath: path.join(projectDir, "render-props.json"),
    outputVideoPath: path.join(projectDir, "demo.mp4"),
  };
  const rawRecordingPath = path.join(projectDir, "recording.mp4");
  const plan: BrowsePlan = {
    version: 1,
    title: "Test Demo",
    prompt: "Create a demo for https://github.com/remotion-dev/remotion",
    urls: ["https://github.com/remotion-dev/remotion"],
    narration: [
      {
        url: "https://github.com/remotion-dev/remotion",
        line: "Highlight the repository and readme.",
        focusLabel: "Remotion overview",
        focusSelectors: ["#readme h1"],
        circleCount: 1,
      },
    ],
    viewport: { width: 1920, height: 1080 },
    steps: [{ action: "navigate", label: "open", url: "https://github.com/remotion-dev/remotion" }],
  };

  let renderCalls = 0;

  const result = await runScreenDemoPipeline({
    rootDir,
    prompt: plan.prompt,
    ensureApiKey: () => "steel-key",
    createProject: () => {
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(project.promptPath, `${plan.prompt}\n`, "utf8");
      return project;
    },
    buildPlan: () => plan,
    buildScript: () => "Scene 1: Highlight the repository and readme.",
    runRecording: async () => {
      fs.writeFileSync(rawRecordingPath, "raw-video", "utf8");
      return {
        session: { id: "sess_123" } as never,
        moments: [
          { timeMs: 1000, action: "click", label: "header" },
          { timeMs: 2400, action: "hover", label: "readme" },
        ],
        sessionPath: project.sessionPath,
        momentsPath: project.momentsPath,
        recordingPath: rawRecordingPath,
      };
    },
    renderScreenDemo: async ({ propsPath, outputPath }) => {
      renderCalls += 1;
      assert.equal(propsPath, project.renderPropsPath);
      assert.equal(outputPath, project.outputVideoPath);
      fs.writeFileSync(outputPath, "rendered-video", "utf8");
    },
  });

  assert.equal(renderCalls, 1);
  assert.equal(result.project.outputVideoPath, project.outputVideoPath);
  assert.ok(fs.existsSync(project.outputVideoPath));
  assert.ok(fs.existsSync(project.editConfigPath));
  assert.ok(fs.existsSync(project.cameraConfigPath));
  assert.ok(fs.existsSync(project.renderPropsPath));

  const editConfig = JSON.parse(fs.readFileSync(project.editConfigPath, "utf8"));
  assert.equal(editConfig.playbackRate, 4);
  assert.equal(editConfig.fps, 30);
  assert.equal(editConfig.clips.length, 1);

  const copiedRecordingPath = path.join(rootDir, "public", "screen-demos", path.basename(projectDir), "recording.mp4");
  assert.ok(fs.existsSync(copiedRecordingPath));
});
