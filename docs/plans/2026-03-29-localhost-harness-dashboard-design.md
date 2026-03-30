# Localhost Harness Dashboard Design

## Goal

Build a localhost app and coded harness that can run the GitHub-project YouTube pipeline end to end with deterministic stage execution, while keeping agent usage only inside bounded creative steps.

The first version should:

- discover fresh GitHub candidates
- research and shortlist repos
- generate a script
- generate audio through API-backed code
- build a recording plan
- drive a real local Windows browser with real cursor movement and real clicks
- capture a usable MP4 using the older, more reliable screen-demo recording/export path
- trim dead time around actions using tutorial-style edit rules
- hand off a trimmed MP4 for manual Cursorful or Recordly polish
- accept the polished MP4 back later for final intro, outro, lower thirds, and packaging

## Design Principles

### Deterministic Outer Flow

The harness, not the agent, owns stage ordering.

Code decides:

- when a stage starts
- what inputs it reads
- what outputs it must write
- what QA checks must pass
- whether the next stage is allowed to run

The system should never depend on an agent to remember what step comes next.

### Agent Work Only Inside Bounded Steps

Agents should be used where judgment or writing quality matters, not as the top-level orchestrator.

Examples:

- script writing
- script refinement
- optional recording-plan refinement
- optional editorial review of shortlisted repos

Examples that should stay code-owned:

- GitHub fetching
- candidate normalization and dedupe
- artifact writing
- API calls
- stage state transitions
- capture file verification
- dead-time trimming
- final packaging assembly

### Favor Proven Paths

The current live local browser driver has value because it visibly moves the real mouse and performs real clicks.

The current FFmpeg-based local capture experiment does not.

So the first harness version should preserve:

- the new local browser-driving behavior

while reusing:

- the older screen-demo style recording/export model
- existing `moments.json` trimming rules
- the proven Remotion packaging path for later stages

This means:

- new browser brain
- old camera

## Architecture Overview

### Top-Level Shape

The app should be split into three layers:

1. Dashboard UI
2. Local harness/orchestrator
3. Stage runners

The dashboard is a control panel over the harness, not the harness itself.

### Layer 1: Dashboard UI

Purpose:

- launch runs
- show stage progress
- display artifacts
- expose rerun controls
- show QA status and failure reasons

The first dashboard should feel like an operator console, not a generic form page.

Primary screens:

- run setup
- active run timeline
- stage outputs
- artifacts and handoff files
- post-Cursorful ingest

### Layer 2: Local Harness

Purpose:

- own the deterministic stage machine
- persist run state to disk
- call agents or APIs only inside stage boundaries
- verify outputs before advancing

The harness should model each run as a directory with typed artifacts and status files.

Suggested run states:

- `pending`
- `running`
- `passed`
- `failed`
- `blocked`
- `ready-for-manual`
- `complete`

### Layer 3: Stage Runners

Purpose:

- implement each stage as a clear contract
- hide internal complexity behind stable input/output schemas

Each stage runner should support:

- `run`
- `resume`
- `verify`
- `summarize`

## Pipeline Stages

### 1. Discovery

Owner:

- code first

Inputs:

- discovery mode
- topic or default GitHub search config
- optional exclusions

Outputs:

- `discovery-candidates.json`
- `discovery-summary.md`

Responsibilities:

- fetch GitHub candidates
- normalize metadata
- dedupe
- filter obvious junk
- score candidates

Agent involvement:

- optional editorial annotation after shortlist

### 2. Research And Selection

Owner:

- both

Inputs:

- discovery candidates
- prior episode history

Outputs:

- `research-notes.json`
- `selected-repos.json`

Responsibilities:

- enrich README and description context
- avoid repetitive picks
- choose the final repos for the episode

Agent involvement:

- useful for editorial framing and prioritization

### 3. Script Generation

Owner:

- both

Inputs:

- selected repos
- research notes
- reusable script prompt template

Outputs:

- `script.md`
- `script.json`

Responsibilities:

- code prepares the prompt packet
- agent writes the script
- code validates that required sections exist

### 4. Audio Generation

Owner:

- code

Inputs:

- approved script
- selected voice/provider config

Outputs:

- narration audio files
- `audio-manifest.json`

Responsibilities:

- call the configured TTS API
- write deterministic output files
- record durations and paths

### 5. Recording Plan

Owner:

- both

Inputs:

- script
- audio manifest
- selected repos

Outputs:

- `recording-plan.json`
- `moments-plan.json`

Responsibilities:

- determine what the browser should show
- translate script/audio into repo passes, hover targets, click targets, scroll windows, and optional video/link actions

The baseline structure should be code-generated from rules.
Agent refinement can optionally improve pacing.

### 6. Browser Drive

Owner:

- both, but mostly code

Inputs:

- recording plan

Outputs:

- live action execution
- runtime action logs

Responsibilities:

- launch the local browser
- keep real OS mouse movement
- keep real clicks
- avoid fake screenshot-only browsing

The browser driver should stay deterministic once the plan is locked.

### 7. Capture

Owner:

- code

Inputs:

- browser driver run
- selected capture mode

Outputs:

- `recording.mp4`
- raw capture metadata

Responsibilities:

- reuse the more reliable screen-demo recording/export path
- reject black or malformed captures
- avoid the current FFmpeg-local black-window lane as the default

### 8. Trim And Package

Owner:

- code

Inputs:

- `recording.mp4`
- `moments.json`

Outputs:

- trimmed MP4
- `edit-config.json`
- handoff bundle for manual Cursorful/Recordly polish

Responsibilities:

- apply tutorial-style trimming:
  - about `500ms` before action
  - about `1000ms` after action
  - merge close clips
- write a clean exported MP4 for manual external editing

### 9. Post-Cursorful Final Assembly

Owner:

- code

Inputs:

- polished MP4 returned manually
- intro/outro assets
- lower-third templates

Outputs:

- final packaged episode

Responsibilities:

- add intro
- add outro
- add lower thirds and motion overlays
- keep this as a later-stage handoff in v1

## Artifact Model

Each run should live in a dedicated runtime directory and be fully resumable from disk.

Suggested artifact set:

- `run.json`
- `discovery-candidates.json`
- `research-notes.json`
- `selected-repos.json`
- `script.md`
- `script.json`
- `audio-manifest.json`
- `recording-plan.json`
- `moments.json`
- `recording.mp4`
- `edit-config.json`
- `trimmed.mp4`
- `handoff.json`

The dashboard should read these artifacts rather than rely on in-memory agent state.

## Dashboard UX

### Core Screens

#### Run Setup

Controls:

- mode: `Daily Discovery` or `Manual URLs`
- repo count
- voice/provider config
- capture mode
- optional “stop after trimmed MP4”

#### Run Console

Shows:

- current stage
- stage status
- start/end time
- last log lines
- failure reason if blocked

#### Artifacts

Shows links and previews for:

- discovery packets
- script
- audio manifest
- recording plan
- raw MP4
- trimmed MP4
- handoff files

#### QA

Shows pass/fail checks for:

- missing outputs
- black capture detection
- zero-byte files
- invalid JSON artifacts
- trim gaps and clip counts

### UI Direction

The dashboard should feel like a production run console:

- high-contrast status signals
- explicit stage cards
- artifact drawers
- visible machine-state rather than hidden progress

This should not look like a generic dashboard template.

## Stage Ownership Matrix

### Code-Owned

- GitHub fetching
- candidate normalization and scoring
- API invocation
- artifact persistence
- state transitions
- capture verification
- trimming and packaging
- final composition assembly

### Agent-Owned

- script writing
- optional script polish
- optional editorial notes

### Mixed

- research
- recording plan generation
- browser walkthrough planning

## QA Gates

Before advancing stages, code should verify:

- required files exist
- JSON validates against schemas
- audio files are non-empty
- capture output is not black
- `moments.json` contains actionable events
- trimmed output is shorter than raw where expected

Failed QA should block the next stage and surface a human-readable reason in the dashboard.

## Why This Matches The Current Repo

This design keeps the best parts that already exist:

- manifest-driven thinking from the existing architecture docs
- `moments.json` and tutorial-style trimming rules from the screen-demo system
- Remotion packaging for later final assembly
- project-local skills for planning, motion, packaging, and walkthroughs

It also corrects the recent drift:

- no more treating the experimental FFmpeg local-capture lane as the main product path
- no more letting the recorder design dictate the whole system shape

## Out Of Scope For V1

- Hacker News discovery
- fully automatic Cursorful or Recordly import/export
- multi-source discovery ranking beyond GitHub
- voice/provider marketplace UX
- final publish/upload automation

## Recommendation

Implement a coded localhost harness with a dashboard UI on top, using:

- hybrid GitHub discovery
- bounded agent stages for research and script work
- the new local browser-driving behavior
- the older, more reliable screen-demo recording/export approach
- trim-to-MP4 handoff as the v1 finish line

This creates a repeatable program rather than a prompt ritual.
