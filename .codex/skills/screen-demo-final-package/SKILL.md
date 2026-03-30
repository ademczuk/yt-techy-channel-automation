---
name: screen-demo-final-package
description: Use when a trimmed screen-demo project needs the final Remotion render with the configured background, playback rate, and camera moves applied to the recording.
---

# Screen Demo Final Package

## Overview

Use this project-local skill for the final packaged render stage.

## Rules

- Render from `render-props.json`, not by guessing settings from memory.
- Keep the final package tied to the saved project folder.
- Preserve the configured `60fps` and `4x` playback in the Remotion render props unless a deliberate edit changes them.
- Treat the Remotion pass as the place where the trimmed clips and camera moves become the final deliverable.
- If a local real-mouse capture lane is used, package from the saved action-trim config so dead time between real interactions stays removed in the final demo.

## Current Files

- [screen-demo-render.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/screen-demo-render.ts)
- [render-screen-demo.ts](C:/YT/Code%20Search/clawhub-weekly-master/scripts/render-screen-demo.ts)
- [ScreenDemoComposition.tsx](C:/YT/Code%20Search/clawhub-weekly-master/src/compositions/ScreenDemoComposition.tsx)

## Validation

- run `npm run screen-demo:render -- --props screen-demos/<project>/render-props.json --output screen-demos/<project>/demo.mp4`
- verify `demo.mp4` exists and is decodable
