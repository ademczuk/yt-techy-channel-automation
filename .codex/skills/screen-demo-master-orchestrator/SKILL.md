---
name: screen-demo-master-orchestrator
description: Use when one command or dashboard action should coordinate the full screen-demo workflow in the correct order, call the stage skills, fill gaps, and run QA before the episode is considered ready.
---

# Screen Demo Master Orchestrator

## Overview

Use this project-local skill as the top-level workflow for the eventual dashboard button.

## Order

1. Use [screen-demo-source-selection](/C:/YT/Code%20Search/clawhub-weekly-master/.codex/skills/screen-demo-source-selection/SKILL.md)
2. Use [screen-demo-repo-research](/C:/YT/Code%20Search/clawhub-weekly-master/.codex/skills/screen-demo-repo-research/SKILL.md)
3. Use [screen-demo-title-authoring](/C:/YT/Code%20Search/clawhub-weekly-master/.codex/skills/screen-demo-title-authoring/SKILL.md)
4. Use [screen-demo-description-authoring](/C:/YT/Code%20Search/clawhub-weekly-master/.codex/skills/screen-demo-description-authoring/SKILL.md)
5. Use [screen-demo-thumbnail-creation](/C:/YT/Code%20Search/clawhub-weekly-master/.codex/skills/screen-demo-thumbnail-creation/SKILL.md)
6. Use [screen-demo-script-authoring](/C:/YT/Code%20Search/clawhub-weekly-master/.codex/skills/screen-demo-script-authoring/SKILL.md)
7. Use `$text-to-speech` when the voiceover stage is enabled
8. Use [screen-demo-recording-plan](/C:/YT/Code%20Search/clawhub-weekly-master/.codex/skills/screen-demo-recording-plan/SKILL.md)
9. Use [screen-demo-pipeline](/C:/YT/Code%20Search/clawhub-weekly-master/.codex/skills/screen-demo-pipeline/SKILL.md) for record/edit/render
10. Use [screen-demo-qa](/C:/YT/Code%20Search/clawhub-weekly-master/.codex/skills/screen-demo-qa/SKILL.md)

## Rules

- Do not skip ahead to writing or visuals before the source list is locked.
- Treat the pipeline as code-owned stage order, not improvisation.
- If a stage is not yet auto-wired in code, the master skill should still enforce the order and call the right supporting skills.
- Do not treat the episode as ready if QA fails.
- The recording/edit lane must preserve full scroll motion, visible cursor travel, and selective zoom windows before the episode is considered visually approved.

## Current Boundary

- The live code path currently proves `script -> recording plan -> record -> trim -> final render`.
- Metadata, thumbnail, and audio stages are now documented as explicit skills for orchestration, but they are not all auto-wired into the CLI yet.
