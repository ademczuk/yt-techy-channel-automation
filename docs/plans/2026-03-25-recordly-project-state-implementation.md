# Recordly Project State Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a repeatable Recordly editing lane that writes project-state defaults, converts walkthrough focus cues into calmer zoom regions, and runs a short two-repo test with enforced capture defaults.

**Architecture:** Keep Playwright as the walkthrough driver and treat Recordly as the selected-window capture plus editor/export layer. Add a small library that writes normalized Recordly project data from a raw recording path and focus cues, then use that in a short scripted test run before the Remotion packaging step.

**Tech Stack:** TypeScript, Node.js, Playwright, Remotion project scripts, Recordly project JSON model, Node test runner

---

### Task 1: Add failing tests for Recordly project-state generation

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\tests\recordly-project.test.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\recordly-project.ts`

**Step 1: Write the failing test**

Cover:
- enforced defaults: no camera, no microphone, no countdown are represented by the runner config
- generated project data sets cursor on, sane cursor style/smoothing, export format, aspect ratio
- focus cues become zoom regions with stable timing and normalized focus

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/recordly-project.test.ts`

**Step 3: Write minimal implementation**

Implement a project builder that:
- accepts `videoPath`, optional `webcamPath`, and focus cues
- returns Recordly-compatible project JSON
- derives zoom regions from cue timestamps and positions

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/recordly-project.test.ts`

### Task 2: Add a writer for `.recordly` project files

**Files:**
- Modify: `C:\YT\Code Search\clawhub-weekly-master\src\lib\recordly-project.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\scripts\lib\recordly-project-writer.ts`

**Step 1: Write the failing test**

Cover:
- writing a project file next to a captured video
- deterministic file naming
- preserving video path and generated editor state

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/recordly-project.test.ts`

**Step 3: Write minimal implementation**

Add a helper to:
- write a `.recordly` file for a given capture
- optionally include a linked webcam path
- return the project path

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/recordly-project.test.ts`

### Task 3: Wire a short Recordly test runner with enforced capture defaults

**Files:**
- Modify: `C:\YT\Code Search\clawhub-weekly-master\scripts\test-recordly.ts`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\scripts\lib\github-walkthrough.ts`

**Step 1: Write the failing test**

Cover:
- no webcam requested
- no microphone requested
- no countdown requested
- two repo targets supported in one short test session

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/recordly-project.test.ts`

**Step 3: Write minimal implementation**

Update the Recordly test lane so it:
- explicitly disables webcam, microphone, and countdown
- captures two GitHub repos in a short run
- writes focus cues and a `.recordly` project for each clip

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/recordly-project.test.ts`

### Task 4: Verify end-to-end

**Files:**
- Use existing scripts and runtime outputs

**Step 1: Run focused verification**

Run:
- `npm test`
- `npm run build`
- `npm run capture:test:recordly -- --duration=30`

**Step 2: Review outputs**

Confirm:
- raw capture files exist
- focus cue JSON exists
- `.recordly` files exist
- timing stays short enough for an iteration pass

**Step 3: Commit**

Do not commit unless the user asks.
