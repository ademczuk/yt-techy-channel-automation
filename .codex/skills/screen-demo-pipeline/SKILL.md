---
name: screen-demo-pipeline
description: Use when creating a polished Screen Studio-style browser demo from one natural-language prompt, especially when the workflow should create a project folder, structured browse plan, recorded browser session artifacts, edit config, camera keyframes, and a Remotion render packet.
---

# Screen Demo Pipeline

## Overview

Use this project-local skill to run a deterministic `plan -> record -> edit -> render` browser demo workflow.

The current proven lane is:

- Steel for browser execution and recording
- generated `script.txt` and `browse-plan.json` per run
- narration beats that drive focus targets
- smoother cursor travel, circles, and segmented scroll
- Remotion for the final packaged output

The local experimental lane can also:

- drive real OS mouse movement
- perform real clicks on live browser targets
- capture a fullscreen browser window on the primary screen
- trim dead time from recorded action moments before the final render

## Quick Start

1. Run setup:

```powershell
npm run screen-demo:setup
```

2. Create a demo project from one prompt:

```powershell
npm run screen-demo -- "Create a polished product demo for https://example.com and show the signup flow."
```

3. Render a saved project:

```powershell
npm run screen-demo:render -- --props screen-demos/<project>/render-props.json --output screen-demos/<project>/demo.mp4
```

## What This Skill Expects

- `STEEL_API_KEY` available in environment
- `ffmpeg` installed if session recording export needs normalization
- a prompt containing one or more URLs

## Artifacts

The harness writes:

- `prompt.txt`
- `script.txt`
- `browse-plan.json`
- `session.json`
- `moments.json`
- `camera-config.json`
- `edit-config.json`
- `render-props.json`
- `recording.mp4` as the raw browser capture
- `demo.mp4` as the trimmed Remotion render

## Stage Order

- script draft first
- recording plan second
- Steel recording third
- Remotion trim and camera pass fourth
- final packaged render fifth

The current code path now renders `demo.mp4` from the main `npm run screen-demo` command instead of stopping after raw recording.

## Motion Rules

- Prefer `selectorCandidates` over one brittle selector
- Use one or two cursor circles on key focus areas
- Scroll with smaller segmented wheel ticks, not one large jump
- Preserve the whole visible scroll motion in the trimmed render
- Do not record a loose desktop crop when the intent is a browser demo; maximize or fullscreen the browser first
- Use selective camera punch-ins for important beats, then release back to full-frame between focus windows
- Treat link and video actions as optional unless the prompt makes them mandatory
- Keep GitHub actions narration-aware by writing `script.txt` from the same narration beats that generate the browse plan

## Common Mistakes

- Do not skip the saved project directory. Every run must get its own folder.
- Do not confuse `recording.mp4` with the edited output.
- Do not claim dead-time removal happened unless `demo.mp4` was actually rendered.
- Do not treat Steel session metadata as equivalent to a local final render.
- Do not reintroduce raw `mouse.wheel()` jumps or direct teleport-style mouse moves without a verified reason.
