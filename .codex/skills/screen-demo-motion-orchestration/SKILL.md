---
name: screen-demo-motion-orchestration
description: Use when a browser demo recording needs smoother cursor travel, segmented scrolling, script-aware focus targets, optional GitHub link or video actions, or reusable motion rules that should stay tied to the screen-demo pipeline.
---

# Screen Demo Motion Orchestration

## Overview

Use this project-local skill when the recording works technically but still looks robotic.

## Rules

- Generate narration beats first
- Build browse actions from those narration beats
- Prefer selector candidate lists over one brittle selector
- Let Steel own the visible cursor path with `humanizeInteractions` and `systemCursor`
- Use custom motion code to decide targets and circle geometry, not to fight Steel's cursor engine
- Route cursor travel through a safe mid-page lane when moving between distant targets so GitHub top navigation does not get triggered
- Draw one or two circles on key focus targets
- Scroll as a full visible action from start to finish, using smaller segmented motion over time instead of jump cuts
- Only zoom in on selectively important focus targets, then release back to full-frame after the focus window ends
- Treat link and video actions as optional unless the prompt requires them

## Steel Requirement

- Keep Steel `debugConfig.systemCursor: true`
- Keep Steel `stealthConfig.humanizeInteractions: true`
- Do not flood Steel with dense micro-move paths, because that stretches simple actions into dead air
- The raw recording should contain the real cursor path; Remotion should not be relied on to fake cursor motion later

## Camera Requirement

- Camera config acts like a virtual camera
- Keyframes should decide:
  - where to focus
  - what to zoom in on
  - how long the zoom should stay in
- Do not keep a whole clip in one long zoom just because one keyframe exists inside it
- Return to scale `1` between selective focus windows unless two focus windows intentionally overlap

## Current Files

- [screen-demo-harness.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/screen-demo-harness.ts)
- [screen-demo-motion.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/screen-demo-motion.ts)
- [screen-demo-steel.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/screen-demo-steel.ts)

## Validation

- run `node --import tsx --test tests/screen-demo-harness.test.ts`
- run `node --import tsx --test tests/screen-demo-motion.test.ts`
- then run `npm run screen-demo -- "<prompt>"`
