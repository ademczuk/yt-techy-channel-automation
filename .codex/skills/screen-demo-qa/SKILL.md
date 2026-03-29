---
name: screen-demo-qa
description: Use when a screen-demo run needs quality gates checked before the output is treated as ready for packaging, dashboard use, or publishing.
---

# Screen Demo QA

## Overview

Use this project-local skill near the end of the pipeline and after any major recording or edit change.

## QA Gates

- `recording.mp4` exists
- `demo.mp4` exists
- raw and final durations are sensible
- no obvious black tail or blank final section
- cursor is visible and actually travels
- scroll sections show the continuous motion, not just the end position
- no accidental top-nav or browser-chrome hover menus covering the content

## Current Files

- [video-validation.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/video-validation.ts)
- [screen-demo-remotion.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/screen-demo-remotion.ts)

## Validation

- run `node --import tsx --test tests/video-validation.test.ts`
- inspect extracted frames from the final `demo.mp4`

