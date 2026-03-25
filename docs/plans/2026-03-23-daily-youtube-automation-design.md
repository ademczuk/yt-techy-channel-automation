# Daily YouTube Automation Design

**Date:** 2026-03-23

## Summary

The project will evolve from a hardcoded Remotion demo into a manifest-driven YouTube automation system for the `Code Search` channel.

The first deliverable is a daily roundup lane that can automatically create a publish-ready bundle from sourced tools and generated assets.

## Approved Decisions

- prioritize the daily roundup lane first
- keep the dashboard out of MVP scope
- replace hardcoded episode content with a generated manifest pipeline
- use a hybrid capture strategy
- remove the daily lower-third requirement
- keep intro splash to `1-3` seconds
- daily videos should contain `10-15` tools
- daily per-tool segments should run `25-50` seconds
- daily outro should be short and neutral

## Daily Format

### Intro

- `1-3` second splash
- brief spoken setup

### Per Tool

1. problem hook
2. what it is
3. why developers care
4. optional light note if warranted

### Outro

- brief neutral signoff
- no forced rankings at the end

## Capture Direction

### Daily MVP

- screenshot-based by default
- use synthetic motion for speed and stability
- require QA snapshots so low-quality motion is caught

### Premium / Manual Lanes

- use real guided capture where interaction matters
- drive sites or apps with browser automation
- capture with Recordly when authentic cursor behavior is important

## Relevant Installed Skills

- `recordly-screen-recorder`
  - real cursor telemetry
  - click animation
  - smoothing
  - zoom regions

- `agent-browser`
  - browser automation and navigation

- `google-stitch-remotion`
  - reference for polished walkthrough-style motion

## Reason For Manifest-Driven Rendering

The renderer should stay stable while content changes every day.

The generator should create content and assets. Remotion should render from those generated inputs instead of requiring edits to TypeScript episode data for every run.

## Expected MVP Output

- `video.mp4`
- `thumbnail.png`
- `title.txt`
- `description.txt`
- `manifest.json`
- `sources.txt`

## Next Step

Implement the command-line MVP pipeline first, then wrap it with a dashboard later.
