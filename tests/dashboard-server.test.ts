import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createDashboardServer } from "../src/dashboard/server";

test("dashboard server can create, list, inspect, and run the ordered pipeline stages for a harness run", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "dashboard-server-"));
  fs.mkdirSync(path.join(rootDir, "dashboard"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "dashboard", "index.html"), "<!doctype html><html><body>dashboard</body></html>", "utf8");

  const server = await createDashboardServer({
    rootDir,
    port: 0,
    runGitHubDiscovery: async ({ runDir }) => {
      const outputPath = path.join(runDir, "discovery-candidates.json");
      const summaryPath = path.join(runDir, "discovery-summary.md");
      fs.writeFileSync(outputPath, `${JSON.stringify([
        {
          slug: "openai/codex",
          name: "codex",
          source: "github-trending",
          url: "https://github.com/openai/codex",
          description: "AI coding agent for developer workflows.",
          readmeSummary: "Codex helps developers run code tasks with agentic workflows and repository context.",
          language: "TypeScript",
          starsToday: 1234,
          collectedAt: "2026-03-29T21:00:00.000Z",
          score: 49.3,
          reasons: ["high daily star velocity"],
          fitBucket: "core",
        },
      ], null, 2)}\n`, "utf8");
      fs.writeFileSync(summaryPath, "# Discovery Summary\n", "utf8");
      return {
        candidates: [
          {
            slug: "openai/codex",
            name: "codex",
            source: "github-trending",
            url: "https://github.com/openai/codex",
            description: "AI coding agent for developer workflows.",
            readmeSummary: "Codex helps developers run code tasks with agentic workflows and repository context.",
            language: "TypeScript",
            starsToday: 1234,
            collectedAt: "2026-03-29T21:00:00.000Z",
            score: 49.3,
            reasons: ["high daily star velocity"],
            fitBucket: "core",
          },
        ],
        outputPath,
        summaryPath,
        cacheDir: path.join(runDir, "cache"),
      };
    },
    runGitHubResearch: async ({ runDir }) => {
      const shortlistPath = path.join(runDir, "research-shortlist.json");
      const briefPath = path.join(runDir, "research-brief.md");
      fs.writeFileSync(shortlistPath, `${JSON.stringify([
        {
          slug: "openai/codex",
          name: "codex",
          url: "https://github.com/openai/codex",
          score: 49.3,
          fitBucket: "core",
          summary: "Codex helps developers run code tasks with agentic workflows and repository context.",
          reasons: ["high daily star velocity"],
          recommendedAngle: "Lead with the workflow payoff.",
          visualProof: ["Repository header"],
        },
      ], null, 2)}\n`, "utf8");
      fs.writeFileSync(briefPath, "# Research Brief\n", "utf8");
      return {
        selected: [
          {
            slug: "openai/codex",
            name: "codex",
            url: "https://github.com/openai/codex",
            score: 49.3,
            fitBucket: "core",
            summary: "Codex helps developers run code tasks with agentic workflows and repository context.",
            reasons: ["high daily star velocity"],
            recommendedAngle: "Lead with the workflow payoff.",
            visualProof: ["Repository header"],
          },
        ],
        shortlistPath,
        briefPath,
      };
    },
    runHarnessScript: async ({ runDir }) => {
      const promptPath = path.join(runDir, "script-prompt.json");
      const packetPath = path.join(runDir, "script-packet.json");
      const scriptPath = path.join(runDir, "script.md");
      fs.writeFileSync(promptPath, `${JSON.stringify({
        mode: "bounded-agent-script",
        repos: [{ slug: "openai/codex" }],
        constraints: { titlePrefix: "Code Search" },
      }, null, 2)}\n`, "utf8");
      fs.writeFileSync(packetPath, `${JSON.stringify({
        episodeTitle: "Code Search Daily",
        repos: [{ slug: "openai/codex", name: "codex", url: "https://github.com/openai/codex", script: "Codex is trending." }],
      }, null, 2)}\n`, "utf8");
      fs.writeFileSync(scriptPath, "# Script\n", "utf8");
      return {
        packet: {
          episodeTitle: "Code Search Daily",
          repos: [{ slug: "openai/codex", name: "codex", url: "https://github.com/openai/codex", script: "Codex is trending." }],
        },
        promptPath,
        packetPath,
        scriptPath,
      };
    },
    runHarnessAudio: async ({ runDir }) => {
      const manifestPath = path.join(runDir, "audio-manifest.json");
      fs.writeFileSync(manifestPath, `${JSON.stringify({
        totalDurationMs: 1000,
        segments: [{ id: "repo-openai-codex", label: "codex", path: "audio/openai-codex.mp3", durationMs: 1000 }],
      }, null, 2)}\n`, "utf8");
      return {
        manifest: {
          totalDurationMs: 1000,
          segments: [{ id: "repo-openai-codex", label: "codex", path: "audio/openai-codex.mp3", durationMs: 1000 }],
        },
        manifestPath,
      };
    },
    runHarnessRecordingPlan: async ({ runDir }) => {
      const planPath = path.join(runDir, "recording-plan.json");
      fs.writeFileSync(planPath, `${JSON.stringify({
        repoUrls: ["https://github.com/openai/codex"],
        capturePrompt: "Capture Codex with real mouse movement.",
      }, null, 2)}\n`, "utf8");
      return {
        plan: {
          repoUrls: ["https://github.com/openai/codex"],
          capturePrompt: "Capture Codex with real mouse movement.",
        },
        planPath,
      };
    },
    runHarnessCapture: async ({ runDir }) => {
      const projectDir = path.join(runDir, "screen-demo-project");
      fs.mkdirSync(projectDir, { recursive: true });
      const outputVideoPath = path.join(projectDir, "demo.mp4");
      fs.writeFileSync(outputVideoPath, "video", "utf8");
      return {
        projectDir,
        outputVideoPath,
        recordingPath: path.join(projectDir, "recording.mp4"),
        momentsPath: path.join(projectDir, "moments.json"),
        editConfigPath: path.join(projectDir, "edit-config.json"),
        renderPropsPath: path.join(projectDir, "render-props.json"),
      };
    },
  });

  try {
    const baseUrl = `http://127.0.0.1:${server.port}`;
    const createResponse = await fetch(`${baseUrl}/api/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "daily-discovery" }),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json() as { run: { id: string } };

    const listResponse = await fetch(`${baseUrl}/api/runs`);
    assert.equal(listResponse.status, 200);
    const listed = await listResponse.json() as Array<{ id: string }>;
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.id, created.run.id);

    const inspectResponse = await fetch(`${baseUrl}/api/runs/${created.run.id}`);
    assert.equal(inspectResponse.status, 200);
    const inspected = await inspectResponse.json() as { id: string };
    assert.equal(inspected.id, created.run.id);

    const discoveryResponse = await fetch(`${baseUrl}/api/runs/${created.run.id}/stages/discovery`, {
      method: "POST",
    });
    assert.equal(discoveryResponse.status, 200);
    const discoveryResult = await discoveryResponse.json() as {
      run: {
        stages: Array<{ stage: string; status: string }>;
        artifacts: Array<{ relativePath: string }>;
      };
    };
    assert.equal(
      discoveryResult.run.stages.find((stage) => stage.stage === "discovery")?.status,
      "passed",
    );

    const researchResponse = await fetch(`${baseUrl}/api/runs/${created.run.id}/stages/research`, {
      method: "POST",
    });
    assert.equal(researchResponse.status, 200);
    const researchResult = await researchResponse.json() as {
      run: {
        stages: Array<{ stage: string; status: string }>;
        artifacts: Array<{ relativePath: string }>;
      };
    };
    assert.equal(
      researchResult.run.stages.find((stage) => stage.stage === "research")?.status,
      "passed",
    );

    const pipelineResponse = await fetch(`${baseUrl}/api/runs/${created.run.id}/pipeline`, {
      method: "POST",
    });
    assert.equal(pipelineResponse.status, 200);
    const pipelineResult = await pipelineResponse.json() as {
      run: {
        stages: Array<{ stage: string; status: string }>;
        artifacts: Array<{ relativePath: string }>;
      };
    };
    assert.equal(
      pipelineResult.run.stages.find((stage) => stage.stage === "script")?.status,
      "passed",
    );
    assert.equal(
      pipelineResult.run.stages.find((stage) => stage.stage === "audio")?.status,
      "passed",
    );
    assert.equal(
      pipelineResult.run.stages.find((stage) => stage.stage === "recordingPlan")?.status,
      "passed",
    );
    assert.equal(
      pipelineResult.run.stages.find((stage) => stage.stage === "capture")?.status,
      "passed",
    );

    const artifactsResponse = await fetch(`${baseUrl}/api/runs/${created.run.id}/artifacts`);
    assert.equal(artifactsResponse.status, 200);
    const artifacts = await artifactsResponse.json() as Array<{ relativePath: string }>;
    assert.deepEqual(
      artifacts.map((artifact) => artifact.relativePath),
      [
        "audio-manifest.json",
        "discovery-candidates.json",
        "discovery-summary.md",
        "recording-plan.json",
        "research-brief.md",
        "research-shortlist.json",
        "screen-demo-project/demo.mp4",
        "script-packet.json",
        "script-prompt.json",
        "script.md",
      ],
    );
  } finally {
    await server.close();
  }
});
