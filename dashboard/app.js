import { createEmptyRun, stageDefinitions } from "./data.js";

const state = {
  mode: "daily-discovery",
  currentRun: createEmptyRun(),
  artifacts: [],
  busy: false,
};

const dashboardApi = {
  async loadRuns() {
    const response = await fetch("/api/runs");
    if (!response.ok) {
      throw new Error(`Failed to load runs: ${response.status}`);
    }

    const runs = await response.json();
    if (Array.isArray(runs) && runs.length > 0) {
      state.currentRun = runs[0];
      state.mode = runs[0].mode ?? state.mode;
      await dashboardApi.loadArtifacts();
    }
    render();
  },
  async createRun() {
    return runAction(() => createRunRequest());
  },
  async loadArtifacts() {
    if (!state.currentRun?.id || state.currentRun.id === "--") {
      state.artifacts = [];
      return;
    }

    const response = await fetch(`/api/runs/${encodeURIComponent(state.currentRun.id)}/artifacts`);
    if (!response.ok) {
      state.artifacts = [];
      return;
    }

    state.artifacts = await response.json();
  },
  async startRun() {
    return runAction(async () => {
      await createRunRequest();
      await runPipelineRequest();
    });
  },
  async runDiscovery() {
    return runAction(() => runDiscoveryRequest());
  },
  async runResearch() {
    return runAction(() => runResearchRequest());
  },
  async runScript() {
    return runAction(() => runStageRequest("script"));
  },
  async runAudio() {
    return runAction(() => runStageRequest("audio"));
  },
  async runRecordingPlan() {
    return runAction(() => runStageRequest("recording-plan"));
  },
  async runCapture() {
    return runAction(() => runStageRequest("capture"));
  },
  exportHandoff() {
    console.info("[Harness Dashboard] exportHandoff");
  },
};

async function createRunRequest() {
    const response = await fetch("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: state.mode }),
    });
    if (!response.ok) {
      throw new Error(`Failed to create run: ${response.status}`);
    }

    const payload = await response.json();
    state.currentRun = payload.run;
    state.artifacts = [];
    render();
    return payload.run;
}

async function runDiscoveryRequest() {
  if (!state.currentRun?.id || state.currentRun.id === "--") {
    await createRunRequest();
  }

  const response = await fetch(`/api/runs/${encodeURIComponent(state.currentRun.id)}/stages/discovery`, {
    method: "POST",
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error ?? `Discovery failed with ${response.status}`);
  }

  state.currentRun = payload.run;
  await dashboardApi.loadArtifacts();
  render();
}

async function runResearchRequest() {
  if (!state.currentRun?.id || state.currentRun.id === "--") {
    throw new Error("Create a run before running research.");
  }

  const response = await fetch(`/api/runs/${encodeURIComponent(state.currentRun.id)}/stages/research`, {
    method: "POST",
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error ?? `Research failed with ${response.status}`);
  }

  state.currentRun = payload.run;
  await dashboardApi.loadArtifacts();
  render();
}

async function runStageRequest(stagePath) {
  if (!state.currentRun?.id || state.currentRun.id === "--") {
    throw new Error("Create a run before running additional stages.");
  }

  const response = await fetch(`/api/runs/${encodeURIComponent(state.currentRun.id)}/stages/${stagePath}`, {
    method: "POST",
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error ?? `${stagePath} failed with ${response.status}`);
  }

  state.currentRun = payload.run;
  await dashboardApi.loadArtifacts();
  render();
}

async function runPipelineRequest() {
  if (!state.currentRun?.id || state.currentRun.id === "--") {
    throw new Error("Create a run before starting the pipeline.");
  }

  const response = await fetch(`/api/runs/${encodeURIComponent(state.currentRun.id)}/pipeline`, {
    method: "POST",
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error ?? `Pipeline failed with ${response.status}`);
  }

  state.currentRun = payload.run;
  await dashboardApi.loadArtifacts();
  render();
}

if (typeof window !== "undefined") {
  window.__HARNESS_DASHBOARD__ = dashboardApi;
}

function init() {
  bindFormState();
  bindActions();
  dashboardApi.loadRuns().catch((error) => {
    console.error(error);
    render();
  });
}

function bindActions() {
  document.querySelectorAll("[data-action='capture-mode']").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-action='capture-mode']").forEach((candidate) => {
        candidate.classList.remove("is-active");
      });
      button.classList.add("is-active");
    });
  });

  document.querySelector("[data-action='run-full-pipeline']")?.addEventListener("click", () => {
    dashboardApi.startRun().catch(console.error);
  });
  document.querySelector("[data-action='run-discovery']")?.addEventListener("click", () => {
    dashboardApi.runDiscovery().catch(console.error);
  });
  document.querySelector("[data-action='run-research']")?.addEventListener("click", () => {
    dashboardApi.runResearch().catch(console.error);
  });
  document.querySelector("[data-action='run-script']")?.addEventListener("click", () => {
    dashboardApi.runScript().catch(console.error);
  });
  document.querySelector("[data-action='run-audio']")?.addEventListener("click", () => {
    dashboardApi.runAudio().catch(console.error);
  });
  document.querySelector("[data-action='run-recording-plan']")?.addEventListener("click", () => {
    dashboardApi.runRecordingPlan().catch(console.error);
  });
  document.querySelector("[data-action='run-capture']")?.addEventListener("click", () => {
    dashboardApi.runCapture().catch(console.error);
  });
  document.querySelector("[data-action='export-handoff']")?.addEventListener("click", dashboardApi.exportHandoff);
}

function bindFormState() {
  const runMode = document.querySelector("select[name='runMode']");
  runMode?.addEventListener("change", (event) => {
    state.mode = event.target.value;
    render();
  });
}

function render() {
  const run = state.currentRun;
  const now = new Date(run.updatedAt);
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    month: "short",
    day: "numeric",
  }).format(now);

  setText("[data-role='run-status']", stateLabel(run.status));
  setText("[data-role='run-id']", `Run ${run.id}`);
  setText("[data-role='last-sync']", `Synced ${timeLabel}`);
  setText("[data-role='current-mode']", modeLabel(state.mode));
  setText("[data-role='selected-count']", String(state.artifacts.length));
  setText("[data-role='capture-lane']", "Screen-demo capture");
  setText("[data-role='log-count']", `${(run.log ?? []).length} events`);

  renderStages(run);
  renderArtifacts();
  renderQa(run);
  renderLog(run);
}

function renderStages(run) {
  const list = document.querySelector("[data-role='stage-list']");
  if (!list) return;

  list.innerHTML = stageDefinitions
    .map((definition) => {
      const stage = run.stages.find((entry) => entry.stage === definition.id) ?? { status: "pending" };
      const progress = progressFor(stage.status);
      return `
        <li class="stage-item is-${stage.status}">
          <div class="stage-badge">${definition.id.slice(0, 2).toUpperCase()}</div>
          <div class="stage-body">
            <div class="stage-title">
              <span>${definition.title}</span>
              <span class="stage-status">${stageLabel(stage.status)}</span>
            </div>
            <div class="stage-meta">
              <span>${stage.summary || definition.description}</span>
              <span class="mono">${definition.owner}</span>
            </div>
            <div class="stage-progress" style="--progress: ${progress}%">
              <span></span>
            </div>
          </div>
          <div class="mono">${progress}%</div>
        </li>
      `;
    })
    .join("");
}

function renderArtifacts() {
  const list = document.querySelector("[data-role='artifact-list']");
  if (!list) return;

  list.innerHTML = state.artifacts.length === 0
    ? `<article class="artifact-item artifact-empty"><div class="artifact-name">No artifacts yet</div><div class="artifact-path">Run discovery to generate the first disk-backed outputs.</div></article>`
    : state.artifacts
    .map((artifact) => `
      <article class="artifact-item">
        <div class="artifact-head">
          <div class="artifact-name">${artifact.relativePath.split("/").at(-1)}</div>
          <span class="artifact-kind is-${artifact.relativePath.split(".").at(-1)}">${artifact.relativePath.split(".").at(-1)}</span>
        </div>
        <div class="artifact-path">${artifact.relativePath}</div>
        <div class="artifact-meta">
          <span>${formatBytes(artifact.size)}</span>
          <span>Disk backed</span>
        </div>
      </article>
    `)
    .join("");
}

function renderQa(run) {
  const list = document.querySelector("[data-role='qa-list']");
  if (!list) return;

  const qaItems = buildQaItems(run);
  list.innerHTML = qaItems
    .map((item) => `
      <article class="qa-item">
        <div class="qa-head">
          <div class="qa-title">${item.title}</div>
          <span class="qa-state is-${item.state}">${item.state}</span>
        </div>
        <div class="qa-note">${item.detail}</div>
      </article>
    `)
    .join("");
}

function renderLog(run) {
  const stream = document.querySelector("[data-role='log-stream']");
  if (!stream) return;

  const persistedLog = run.log ?? [];
  const derivedLog = persistedLog.length > 0 ? persistedLog : run.stages
    .filter((stage) => stage.summary)
    .map((stage) => ({
      time: run.updatedAt,
      message: `${stage.stage}: ${stage.summary}`,
    }));

  stream.innerHTML = derivedLog
    .map(
      (entry) => `
        <div class="log-row">
          <span class="log-time">${toShortTime(entry.time)}</span>
          <span class="log-message">${entry.message}</span>
        </div>
      `,
    )
    .join("");
}

function stateLabel(status) {
  switch (status) {
    case "running":
      return "Running";
    case "passed":
      return "Passed";
    case "failed":
      return "Failed";
    case "blocked":
      return "Blocked";
    case "ready-for-manual":
    case "readyForManual":
      return "Ready For Manual";
    default:
      return "Pending";
  }
}

function stageLabel(status) {
  switch (status) {
    case "running":
      return "Running";
    case "passed":
      return "Passed";
    case "failed":
      return "Failed";
    case "blocked":
      return "Blocked";
    case "readyForManual":
      return "Ready For Manual";
    default:
      return "Pending";
  }
}

function modeLabel(mode) {
  switch (mode) {
    case "daily-discovery":
      return "Daily Discovery";
    case "manual-urls":
      return "Manual URLs";
    case "post-polish":
      return "Post Polish Ingest";
    default:
      return "Daily Discovery";
  }
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

function progressFor(status) {
  switch (status) {
    case "passed":
      return 100;
    case "running":
      return 62;
    case "readyForManual":
      return 96;
    case "failed":
    case "blocked":
      return 100;
    default:
      return 8;
  }
}

function buildQaItems(run) {
  return [
    {
      title: "Run State File",
      state: run.id !== "--" ? "pass" : "warn",
      detail: run.id !== "--" ? "Harness run exists and is disk-backed." : "No run has been created yet.",
    },
    {
      title: "Artifact Outputs",
      state: state.artifacts.length > 0 ? "pass" : "warn",
      detail: state.artifacts.length > 0
        ? `${state.artifacts.length} artifact files are available.`
        : "No artifacts have been written yet.",
    },
    {
      title: "Stage Failures",
      state: run.stages.some((stage) => stage.status === "failed") ? "fail" : "pass",
      detail: run.stages.some((stage) => stage.status === "failed")
        ? "One or more harness stages failed."
        : "No failed stages are currently recorded.",
    },
  ];
}

async function runAction(action) {
  if (state.busy) {
    return;
  }

  state.busy = true;
  try {
    await action();
  } catch (error) {
    console.error(error);
  } finally {
    state.busy = false;
  }
}

function formatBytes(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function toShortTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", init);
}
