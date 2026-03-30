---
name: screen-demo-recording-plan
description: Use when a screen-demo script needs to become a structured browse-plan.json with URLs, selectors, waits, optional link or video actions, and narration-aware screen focus.
---

# Screen Demo Recording Plan

## Overview

Use this project-local skill to turn the script beats into `browse-plan.json`.

## Rules

- Build the recording plan after the script draft exists.
- Every major interaction should carry the related `scriptLine`.
- Prefer `selectorCandidates` over one brittle selector.
- Treat external links and videos as optional unless the prompt makes them mandatory.
- Keep switches between pages or tabs explicit in the plan instead of assuming the browser state will “just follow.”
- When the lane uses real mouse movement and clicking, plan for those interactions explicitly instead of relying on hover-only coverage.
- Prefer scroll actions that can be executed as segmented smooth in-page motion rather than abrupt wheel jumps.

## Current Files

- [screen-demo-harness.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/screen-demo-harness.ts)
- [screen-demo-types.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/screen-demo-types.ts)
- [screen-demo-steel.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/screen-demo-steel.ts)

## Current Boundary

- The current plan is script-aware.
- The current plan is not yet driven by real generated audio duration.
- When the audio stage is added, scene timing should be derived from that audio, not hardcoded waits.

## Validation

- run `node --import tsx --test tests/screen-demo-harness.test.ts`
- inspect the run folder’s `browse-plan.json`
