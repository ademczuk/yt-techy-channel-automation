# Daily YouTube Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a manifest-driven MVP that produces one daily `Code Search` roundup bundle from sourced tools, generated scripts, generated assets, and a Remotion render.

**Architecture:** Split the project into a generator layer and a renderer layer. The generator assembles the daily episode manifest and assets. The renderer loads the manifest and exports the final video bundle. Use synthetic screenshot motion for daily MVP and preserve a real-capture lane for later manual formats.

**Tech Stack:** Node.js, TypeScript, Remotion, filesystem JSON manifests, ElevenLabs TTS integration, screenshot capture/browser automation, optional Recordly.

---

### Task 1: Create runtime directories and manifest conventions

**Files:**
- Create: `runtime/README.md`
- Create: `runtime/episodes/.gitkeep`
- Create: `runtime/templates/.gitkeep`
- Create: `src/lib/manifest.ts`

**Step 1: Define directory purpose**

Document where generated manifests, audio, screenshots, outputs, and QA images will live.

**Step 2: Add manifest schema**

Move the project toward a formal generated manifest shape that the renderer can consume directly.

**Step 3: Type-check**

Run: `npm run build`

Expected: project bundles without schema import errors.

### Task 2: Stop hardcoding episode content in Root

**Files:**
- Modify: `src/Root.tsx`
- Create: `src/lib/load-manifest.ts`

**Step 1: Add a manifest loader**

Load episode data from a generated JSON file or a known runtime path.

**Step 2: Keep safe fallback behavior**

If no generated manifest exists, fail clearly or use a small dev fixture instead of embedding a full episode in code.

**Step 3: Verify**

Run: `npm run build`

Expected: render path resolves manifest-driven props.

### Task 3: Remove daily lower-third assumptions

**Files:**
- Modify: `src/scenes/SkillScene.tsx`
- Modify: `src/compositions/SkillsWeekly.tsx`
- Modify: `src/lib/episode-types.ts`

**Step 1: Make overlay optional**

Allow daily episodes to render full-screen tool visuals without the current bottom stats bar.

**Step 2: Keep configurability**

Leave room for future overlay styles in battle or deep-dive videos.

**Step 3: Verify visually**

Run: `npm run studio`

Expected: per-tool scenes render cleanly with no required lower-third.

### Task 4: Shorten and rebrand the intro lane

**Files:**
- Modify: `src/scenes/IntroScene.tsx`
- Modify: `src/scenes/OutroScene.tsx`
- Modify: `src/lib/episode-types.ts`

**Step 1: Replace OpenClaw branding**

Update naming and text assumptions to `Code Search`.

**Step 2: Reduce intro duration**

Support `1-3` second splash behavior for the daily lane.

**Step 3: Add neutral outro handling**

Keep the close short and non-judgmental.

**Step 4: Verify**

Run: `npm run studio`

Expected: intro and outro match approved daily format.

### Task 5: Build candidate sourcing

**Files:**
- Create: `scripts/collect-candidates.ts`
- Create: `src/lib/candidate-types.ts`
- Create: `runtime/templates/source-config.example.json`

**Step 1: Normalize source records**

Support candidate collection from the initial selected sources.

**Step 2: Save raw daily candidate set**

Write collected data to a dated JSON file for traceability.

**Step 3: Verify**

Run: `npx tsx scripts/collect-candidates.ts`

Expected: raw candidate JSON is written under `runtime/episodes/<date>/`.

### Task 6: Build ranking and episode selection

**Files:**
- Create: `scripts/build-episode.ts`
- Create: `src/lib/ranker.ts`
- Create: `src/lib/editorial-rules.ts`

**Step 1: Score candidates**

Apply simple ranking factors: trend, novelty, audience fit, visual potential, clarity.

**Step 2: Select 10-15 tools**

Filter duplicates and weak visual candidates.

**Step 3: Verify**

Run: `npx tsx scripts/build-episode.ts`

Expected: selected tool list is written for the target date.

### Task 7: Generate scripts and metadata

**Files:**
- Create: `src/lib/script-prompts.ts`
- Create: `src/lib/metadata-prompts.ts`
- Modify: `scripts/build-episode.ts`

**Step 1: Generate per-tool script blocks**

Use the approved daily structure.

**Step 2: Generate title and description outputs**

Produce plain text assets for publishing.

**Step 3: Verify**

Expected output files:
- `title.txt`
- `description.txt`
- `sources.txt`

### Task 8: Generate screenshots for daily MVP

**Files:**
- Create: `scripts/capture-screenshots.ts`
- Create: `runtime/templates/capture-config.example.json`

**Step 1: Capture one good visual per tool**

Use browser automation or a screenshot lane as appropriate.

**Step 2: Save image metadata**

Persist dimensions needed by Remotion motion logic.

**Step 3: Verify**

Run: `npx tsx scripts/capture-screenshots.ts`

Expected: screenshot assets and metadata are written into the episode folder.

### Task 9: Generate narration audio

**Files:**
- Create: `scripts/generate-audio.ts`
- Create: `runtime/templates/voice-config.example.json`

**Step 1: Generate intro, per-tool, and outro clips**

Lock to one chosen ElevenLabs voice.

**Step 2: Measure durations**

Persist durations into the manifest.

**Step 3: Verify**

Run: `npx tsx scripts/generate-audio.ts`

Expected: audio assets exist and durations are available.

### Task 10: Write the final episode manifest

**Files:**
- Modify: `scripts/build-episode.ts`

**Step 1: Assemble final manifest**

Combine selected tools, scripts, screenshots, and audio references into one renderable JSON.

**Step 2: Verify**

Expected: `manifest.json` is complete and renderer-readable.

### Task 11: Render and export the episode bundle

**Files:**
- Modify: `render.ts`
- Create: `scripts/render-episode.ts`

**Step 1: Render from manifest**

Point the render flow at the generated daily episode folder.

**Step 2: Write bundle output**

Ensure the daily folder contains video and text assets together.

**Step 3: Verify**

Run: `npx tsx scripts/render-episode.ts`

Expected: `video.mp4` is exported beside the manifest.

### Task 12: Add QA frame extraction

**Files:**
- Create: `scripts/extract-qa-frames.ts`
- Create: `runtime/templates/qa-config.example.json`

**Step 1: Sample key frames**

Extract stills from title, middle tools, and outro.

**Step 2: Fail noisy episodes early**

Mark an episode for review if key stills are missing or clearly broken.

**Step 3: Verify**

Expected: QA images are written under the episode output folder.

### Task 13: Add local delivery and Drive-ready folder structure

**Files:**
- Create: `scripts/deliver-episode.ts`
- Create: `runtime/templates/delivery-config.example.json`

**Step 1: Copy publish bundle**

Move final files into a stable output directory.

**Step 2: Support Drive sync path**

Allow copying into a Google Drive-synced folder later without changing the pipeline shape.

**Step 3: Verify**

Expected bundle:
- `video.mp4`
- `thumbnail.png`
- `title.txt`
- `description.txt`
- `manifest.json`
- `sources.txt`

### Task 14: Prepare the optional real-capture lane

**Files:**
- Create: `docs/plans/recordly-capture-lane-notes.md`
- Create: `runtime/templates/recordly-project.example.json`

**Step 1: Document browser driver + Recordly workflow**

Describe how premium/manual videos will pair automated browsing with Recordly capture.

**Step 2: Preserve hybrid architecture**

Do not block the daily screenshot MVP on Recordly integration.

### Task 15: Document CLI workflow for daily use

**Files:**
- Modify: `README.md`
- Modify: `HANDOVER.md`

**Step 1: Add daily operator flow**

Document the exact commands to run the pipeline end to end.

**Step 2: Keep docs short**

Preserve repo clarity while making daily use obvious.

Plan complete and saved to `docs/plans/2026-03-23-daily-youtube-automation-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
