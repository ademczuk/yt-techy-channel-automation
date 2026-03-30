# Localhost Harness Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a localhost dashboard and coded harness that can discover fresh GitHub repos, generate the script/audio/recording plan, drive a real local browser, capture a usable MP4 through the reliable screen-demo recording/export path, trim dead time, and hand off a polished-ready MP4 for manual Cursorful or Recordly editing.

**Architecture:** Add a code-owned run harness with typed stage artifacts and status transitions, then place a React-based localhost dashboard on top of it. Keep agent involvement inside bounded stages like research and script writing, while routing capture through the older screen-demo recording/export model instead of the current FFmpeg-local experimental lane.

**Tech Stack:** TypeScript, React, Node.js built-in server or lightweight local HTTP service, existing Remotion stack, existing screen-demo libs, existing project-local skills, GitHub fetch code, TTS API integration.

---

### Task 1: Add harness type definitions and run-state schemas

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\harness-types.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\tests\harness-types.test.ts`

**Step 1: Write the failing test**

Add tests that validate:
- stage names are stable
- stage status values are stable
- run records validate with Zod
- artifact manifest structure validates

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/harness-types.test.ts`

Expected: FAIL because the new schema file does not exist yet.

**Step 3: Write minimal implementation**

Add:
- stage enum-like string unions
- run status schema
- per-stage status schema
- artifact manifest schema
- helper constructors for initial run state

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/harness-types.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/harness-types.ts tests/harness-types.test.ts
git commit -m "feat: add harness run state schemas"
```

### Task 2: Build the run directory and artifact persistence layer

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\harness-storage.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\tests\harness-storage.test.ts`

**Step 1: Write the failing test**

Test that a new run:
- creates a dedicated runtime directory
- writes `run.json`
- can persist stage status updates
- can list artifact files for the dashboard

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/harness-storage.test.ts`

Expected: FAIL because the storage helpers do not exist yet.

**Step 3: Write minimal implementation**

Implement helpers to:
- create run directories
- write/read `run.json`
- write/read artifact metadata
- update stage status deterministically

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/harness-storage.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/harness-storage.ts tests/harness-storage.test.ts
git commit -m "feat: add harness storage layer"
```

### Task 3: Extract GitHub discovery into a coded harness stage

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\harness-discovery.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\tests\harness-discovery.test.ts`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\src\lib\episode-generator.ts` if needed

**Step 1: Write the failing test**

Test that discovery:
- fetches normalized candidates
- dedupes repeated repos
- filters sponsor/junk entries
- writes deterministic scored outputs

Use mocked GitHub HTML or mocked API responses where possible.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/harness-discovery.test.ts`

Expected: FAIL because the new discovery stage does not exist yet.

**Step 3: Write minimal implementation**

Implement:
- GitHub candidate fetch logic
- normalization helpers
- simple scoring and filtering
- output writers for `discovery-candidates.json`

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/harness-discovery.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/harness-discovery.ts tests/harness-discovery.test.ts
git commit -m "feat: add github discovery stage"
```

### Task 4: Build research and selection stage contracts

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\harness-research.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\tests\harness-research.test.ts`

**Step 1: Write the failing test**

Test that the stage:
- accepts discovery candidates
- writes `research-notes.json`
- writes `selected-repos.json`
- preserves enough metadata for later scripting

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/harness-research.test.ts`

Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- a code-first shortlist builder
- hooks for later agent enrichment
- stable JSON output

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/harness-research.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/harness-research.ts tests/harness-research.test.ts
git commit -m "feat: add research and selection stage"
```

### Task 5: Build script stage input/output contracts

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\harness-script.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\tests\harness-script.test.ts`

**Step 1: Write the failing test**

Test that:
- the code stage can create a repeatable prompt packet
- the result validator rejects incomplete scripts
- `script.md` and `script.json` can both be written

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/harness-script.test.ts`

Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- prompt-packet builder
- script artifact schemas
- result validator
- file writers

Leave the actual agent call behind an interface so the harness stays deterministic.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/harness-script.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/harness-script.ts tests/harness-script.test.ts
git commit -m "feat: add script stage contracts"
```

### Task 6: Build audio generation stage around the existing API lane

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\harness-audio.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\tests\harness-audio.test.ts`
- Modify: existing audio generation helpers if reuse is cleaner

**Step 1: Write the failing test**

Test that:
- the stage accepts script sections
- calls a provider adapter
- writes audio files and `audio-manifest.json`
- rejects zero-length outputs

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/harness-audio.test.ts`

Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- provider adapter interface
- manifest writer
- file verification
- duration collection

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/harness-audio.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/harness-audio.ts tests/harness-audio.test.ts
git commit -m "feat: add audio stage"
```

### Task 7: Build the recording-plan stage that combines code defaults with optional agent refinement

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\harness-recording-plan.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\tests\harness-recording-plan.test.ts`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\src\lib\live-playwright-walkthrough.ts`

**Step 1: Write the failing test**

Test that the stage:
- accepts selected repos, script, and audio timings
- produces a stable `recording-plan.json`
- includes selectors, scroll windows, click targets, and timing envelopes

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/harness-recording-plan.test.ts`

Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- code-first plan builder
- timing alignment helpers
- optional extension point for agent refinement

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/harness-recording-plan.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/harness-recording-plan.ts src/lib/live-playwright-walkthrough.ts tests/harness-recording-plan.test.ts
git commit -m "feat: add recording plan stage"
```

### Task 8: Replace the current local demo capture path with a “new browser brain, old camera” capture runner

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\harness-capture.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\tests\harness-capture.test.ts`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\scripts\capture-live-playwright-demo.ts`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\scripts\test-recordly.ts` if reuse is needed
- Modify: `C:\YT\Code Search\clawhub-weekly-master\src\lib\screen-demo-steel.ts` or shared capture helpers if needed

**Step 1: Write the failing test**

Test that the capture runner:
- accepts a locked recording plan
- preserves real mouse movement and click execution
- routes capture through the reliable recording/export model
- rejects black recordings

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/harness-capture.test.ts`

Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- local browser driver adapter
- reliable capture adapter
- `moments.json` output
- validation for black/empty captures

Remove the current FFmpeg-local capture lane from the default product path.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/harness-capture.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/harness-capture.ts scripts/capture-live-playwright-demo.ts scripts/test-recordly.ts src/lib/screen-demo-steel.ts tests/harness-capture.test.ts
git commit -m "feat: switch local capture to reliable recorder path"
```

### Task 9: Build trim/handoff stage outputs

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\harness-trim.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\tests\harness-trim.test.ts`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\src\lib\screen-demo-harness.ts`

**Step 1: Write the failing test**

Test that the trim stage:
- applies tutorial-style clip windows
- merges nearby clips
- writes `trimmed.mp4`
- writes `handoff.json`

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/harness-trim.test.ts`

Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- trim stage adapter around existing clip logic
- output naming for handoff MP4
- handoff metadata for manual Cursorful/Recordly work

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/harness-trim.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/harness-trim.ts src/lib/screen-demo-harness.ts tests/harness-trim.test.ts
git commit -m "feat: add trim and handoff stage"
```

### Task 10: Build the top-level harness orchestrator

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\harness-runner.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\tests\harness-runner.test.ts`

**Step 1: Write the failing test**

Test that the orchestrator:
- runs stages in deterministic order
- persists run state between stages
- blocks the next stage on QA failure
- supports resume from the last successful stage

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/harness-runner.test.ts`

Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- run-state machine
- stage dispatch
- persistence hooks
- verification gates
- resume logic

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/harness-runner.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/harness-runner.ts tests/harness-runner.test.ts
git commit -m "feat: add deterministic harness runner"
```

### Task 11: Add a localhost API layer for the dashboard

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\dashboard\server.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\dashboard\api.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\tests\dashboard-server.test.ts`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\package.json`

**Step 1: Write the failing test**

Test endpoints for:
- creating a run
- listing runs
- reading run state
- launching a stage
- listing artifacts

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/dashboard-server.test.ts`

Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- local HTTP server
- JSON endpoints
- simple run control commands
- artifact read endpoints

Add npm scripts for launching the dashboard backend.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/dashboard-server.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/dashboard/server.ts src/dashboard/api.ts tests/dashboard-server.test.ts package.json
git commit -m "feat: add localhost dashboard api"
```

### Task 12: Build the dashboard frontend shell

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\dashboard\index.html`
- Create: `C:\YT\Code Search\clawhub-weekly-master\dashboard\src\main.tsx`
- Create: `C:\YT\Code Search\clawhub-weekly-master\dashboard\src\App.tsx`
- Create: `C:\YT\Code Search\clawhub-weekly-master\dashboard\src\styles.css`
- Create: `C:\YT\Code Search\clawhub-weekly-master\dashboard\src\components\RunSetupPanel.tsx`
- Create: `C:\YT\Code Search\clawhub-weekly-master\dashboard\src\components\RunConsole.tsx`
- Create: `C:\YT\Code Search\clawhub-weekly-master\dashboard\src\components\ArtifactPanel.tsx`
- Create: `C:\YT\Code Search\clawhub-weekly-master\dashboard\src\components\QaPanel.tsx`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\package.json`

**Step 1: Write the failing test**

Add lightweight component tests or smoke tests for:
- rendering the setup screen
- rendering stage cards
- rendering artifacts and QA states

**Step 2: Run test to verify it fails**

Run the chosen frontend smoke test command.

Expected: FAIL because the dashboard UI does not exist yet.

**Step 3: Write minimal implementation**

Use the frontend design skills to build:
- a run-operator console
- bold, non-generic visual direction
- explicit stage cards with status signals
- artifact drawers and logs

Keep the UI wired to the localhost API from Task 11.

**Step 4: Run test to verify it passes**

Run the frontend smoke test command and a local manual preview.

Expected: PASS

**Step 5: Commit**

```bash
git add dashboard package.json
git commit -m "feat: add localhost harness dashboard ui"
```

### Task 13: Wire project-local skills and prompts into the harness entry points

**Files:**
- Modify: `C:\YT\Code Search\clawhub-weekly-master\.codex\skills\screen-demo-pipeline\SKILL.md`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\.codex\skills\screen-demo-recording-plan\SKILL.md`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\.codex\skills\screen-demo-motion-orchestration\SKILL.md`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\.codex\skills\screen-demo-final-package\SKILL.md`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\.codex\skills\human-browser-walkthrough\SKILL.md`

**Step 1: Write the failing test**

Add or extend tests that assert the docs/skills align with the new harness stages and artifact names.

**Step 2: Run test to verify it fails**

Run the relevant skill or doc tests if present.

Expected: FAIL or missing coverage.

**Step 3: Write minimal implementation**

Update skills to reference:
- deterministic harness stages
- dashboard entry points
- new browser brain / old camera capture strategy
- handoff MP4 flow

**Step 4: Run test to verify it passes**

Run the same verification again.

Expected: PASS

**Step 5: Commit**

```bash
git add .codex/skills
git commit -m "docs: align project skills with harness dashboard"
```

### Task 14: Final verification and operator runbook

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\docs\run-instructions.md`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\project_memory.md`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\docs\repo_map.md`

**Step 1: Write the failing test**

Add a smoke checklist or script for:
- creating a discovery run
- producing a trimmed MP4
- reading artifacts in the dashboard

**Step 2: Run test to verify it fails**

Run the smoke script or checklist and document the missing items.

Expected: FAIL until all steps are wired.

**Step 3: Write minimal implementation**

Document:
- how to launch the dashboard
- how to run a daily discovery job
- how to stop after trimmed MP4
- how to re-ingest the post-Cursorful MP4 later

Update project memory and repo map to reflect the new harness.

**Step 4: Run test to verify it passes**

Run:
- `npm test`
- dashboard backend smoke test
- one end-to-end trimmed MP4 smoke run

Expected: PASS

**Step 5: Commit**

```bash
git add docs/run-instructions.md project_memory.md docs/repo_map.md
git commit -m "docs: add harness dashboard operator guide"
```
