# Screen Demo Skill Design

**Goal**

Create a project-local Codex skill and harness that turns one natural-language product demo request into a reproducible `plan -> record -> edit -> render` workflow.

**Why this shape**

The user wants real code between steps so the agent cannot silently skip work. The design therefore makes code own the step order, artifact paths, and validation while allowing the agent to help inside specific steps like plan authoring or visual tuning.

## Chosen Approach

Use a project-local Codex skill backed by repo scripts.

- `Skill layer`: documents the workflow, required outputs, and when to use the system.
- `Harness layer`: creates a unique demo project directory, writes structured artifacts, validates each stage, and re-renders from saved state.
- `Recording layer`: uses Steel sessions and Playwright to execute a structured browse plan.
- `Editing layer`: derives trimmed clip segments and camera keyframes from recorded moments.
- `Render layer`: packages the source recording through a dedicated Remotion composition.

## Scope for v1

Build a useful MVP that covers:

- project directory creation
- structured `browse-plan.json`
- deterministic `moments.json` logging
- timeline trimming logic
- automatic camera config generation
- Remotion composition for a polished framed demo
- setup command and env template

Known v1 compromise:

- Steel playback-to-local-MP4 retrieval may still need a provider-specific export step depending on account setup. The harness will still persist session metadata and normalize around a local `recording.mp4` target.

## Artifacts

Each run creates:

- `screen-demos/<slug>-<timestamp>/prompt.txt`
- `screen-demos/<slug>-<timestamp>/browse-plan.json`
- `screen-demos/<slug>-<timestamp>/session.json`
- `screen-demos/<slug>-<timestamp>/moments.json`
- `screen-demos/<slug>-<timestamp>/edit-config.json`
- `screen-demos/<slug>-<timestamp>/camera-config.json`
- `screen-demos/<slug>-<timestamp>/render-props.json`
- `screen-demos/<slug>-<timestamp>/demo.mp4`

## Validation Gates

- `prepare_project`: project directory and prompt artifact exist
- `generate_plan`: browse plan parses and contains at least one URL
- `record_demo`: session metadata and moments file exist
- `build_edit_config`: clip segments and camera keyframes exist
- `render_demo`: final Remotion output file exists

## Why this is the right first cut

This gives us the deterministic harness the user asked for without pretending every external recording/export edge case is solved on day one. It also fits the repo’s current strengths: Playwright, Remotion, structured runtime folders, and TypeScript tests.
