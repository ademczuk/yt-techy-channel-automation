---
name: screen-demo-script-authoring
description: Use when a screen-demo run needs a script-first narration draft that defines what each page section should show before the recording plan is built.
---

# Screen Demo Script Authoring

## Overview

Use this project-local skill to lock the narration beats before the recording plan is generated.

## Rules

- Write `script.txt` first for the run.
- Each scene line must name the page or repo and what the viewer should notice there.
- Each line should be concrete enough that the recording plan can point at real UI targets.
- Keep the narration beats reusable by the next stage instead of inventing a separate browsing story later.

## Current Files

- [screen-demo-harness.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/screen-demo-harness.ts)
- [screen-demo-pipeline.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/screen-demo-pipeline.ts)

## Current Boundary

- `script.txt` is generated before recording.
- Audio timing is not yet the thing driving per-scene durations.
- Until the audio stage is wired in, the browse plan still uses deterministic default durations tied to the narration beats.

## Validation

- run `node --import tsx --test tests/screen-demo-harness.test.ts`
- then run `npm run screen-demo -- "<prompt with one or more URLs>"`

