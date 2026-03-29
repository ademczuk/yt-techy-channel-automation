---
name: screen-demo-remotion-trim
description: Use when a raw screen-demo recording needs dead time removed around actions, nearby actions merged into one clip, and camera keyframes generated for the trimmed edit.
---

# Screen Demo Remotion Trim

## Overview

Use this project-local skill for the first edit pass after recording.

## Rules

- `recording.mp4` is the raw browser capture.
- `demo.mp4` is the trimmed Remotion output.
- Trim each action window from `500ms` before the action to `1000ms` after it.
- Merge clips when the gap is under `2000ms`.
- Split clips when inactivity is `3000ms` or more.
- Camera keyframes should be derived from the recorded interaction bounds.
- Preserve the full visible scroll action inside the trimmed clip instead of jumping from the first scroll frame to the last.
- Use selective zoom windows around key moments, then return to full-frame between them.
- Do not let one early keyframe force a clip-wide zoom for the rest of the edit.
- Do not allow final clips to read past the end of the raw recording, or the tail will go black.

## Current Files

- [screen-demo-harness.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/screen-demo-harness.ts)
- [screen-demo-render.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/screen-demo-render.ts)
- [ScreenDemoComposition.tsx](C:/YT/Code%20Search/clawhub-weekly-master/src/compositions/ScreenDemoComposition.tsx)

## Validation

- run `node --import tsx --test tests/screen-demo-harness.test.ts`
- confirm the run folder contains `edit-config.json`, `camera-config.json`, and `demo.mp4`
