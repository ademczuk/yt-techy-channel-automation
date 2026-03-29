# Screen Demo Motion Upgrade

## Goal

Make the Steel-based screen demo pipeline feel less robotic by tying recording actions to narration beats and using smoother cursor travel, circles, and scrolling.

## What Changed

- `browse-plan.json` now includes `narration` beats
- each narration beat maps to richer GitHub-focused actions
- browse steps now support:
  - `selectorCandidates`
  - `targetKind`
  - `circleCount`
  - `smooth`
  - `optional`
  - `scriptLine`
- `script.txt` is generated from narration beats for each run
- Steel execution now:
  - resolves the first matching selector candidate
  - moves the mouse through interpolated points
  - draws one or two cursor circles around focus targets
  - scrolls in segmented ticks instead of one hard wheel jump
  - attempts optional link and video actions without hard-failing the run

## Why

The previous working path recorded successfully, but it looked robotic:

- direct hover jumps
- jagged wheel scroll
- no narration-aware focus logic
- no reusable script artifact

The new path keeps the proven Steel/Remotion pipeline while improving the motion layer and preserving the successful workflow as reusable local skill documentation.

## Current Boundaries

- narration is still heuristic, not fully LLM-authored
- optional video clicks are best-effort
- audio alignment is not yet time-locked to narration beats
- Remotion zooming still needs a stronger composition pass for premium polish
