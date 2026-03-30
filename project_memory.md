# Project Memory

## Identity

- Project: `yt-techy-channel-automation`
- Local folder: `C:\YT\Code Search\clawhub-weekly-master`
- Current branch at time of writing: `codex/yt-techy-handoff`
- Channel brand: `Code Search`

## Current Mission

Build a localhost app and skill-driven pipeline for AI-run YouTube videos about GitHub projects with:

- repo research
- script generation
- optional audio generation
- browser recording with visible, believable interaction
- dead-time trimming
- Remotion packaging

The highest-value recording direction is real-looking browser interaction that reduces repetitive-content risk on YouTube.

## Proven Working Pieces

- screen-demo pipeline exists
- project-local screen-demo skills exist under `.codex/skills`
- Steel recording plus Remotion packaging works end to end
- dead-time trimming is implemented
- selective zoom windows are implemented

## Current Blocker

The main blocker is still believable final cursor behavior and interaction quality in the finished recording.

The project wants:

- real mouse movement
- real clicks on links
- optional playback of demo videos
- page changes that feel genuinely browsed, not slideshow-like

## Architecture Snapshot

Main split:

- generator/orchestration layer for source selection, scripting, asset prep, and recording plans
- renderer/compositor layer for Remotion packaging

Important recording concept:

- browser/session driver decides what to open and click
- recorder/editor shell captures and polishes the session
- Remotion remains the final compositor

## Key Docs

- `HANDOVER.md`
- `docs/architecture.md`
- `docs/repo_map.md`
- `docs/run-instructions.md`
- `docs/plans/2026-03-26-browser-recording-recovery.md`
- `docs/plans/2026-03-29-browser-recording-handoff.md`

## Important Local Rules

- do not expose live keys from `runtime/*.env`
- do not publish `screen-demos/` or `midscene_run/`
- keep user-specific local paths out of public outputs when possible

## Notes For Future Sessions

- `project_memory.md` is the root-level project intelligence file for this repo
- `HANDOVER.md` is older prototype handoff context and not the full current browser-recording picture
- the most current recording context lives in the March 2026 plan docs
