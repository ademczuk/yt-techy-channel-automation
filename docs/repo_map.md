# Repo Map

## Current Renderer Core

- `render.ts`
  - entry point for bundling and rendering
- `src/index.ts`
  - registers Remotion root
- `src/Root.tsx`
  - currently hardcodes prototype episode data
- `src/compositions/SkillsWeekly.tsx`
  - main sequence orchestration

## Scene Components

- `src/scenes/IntroScene.tsx`
  - title and intro scene
- `src/scenes/EcosystemPulseScene.tsx`
  - stats scene
- `src/scenes/SectionHeaderScene.tsx`
  - section title cards
- `src/scenes/SkillScene.tsx`
  - per-tool scene wrapper
- `src/scenes/OutroScene.tsx`
  - closing scene

## Visual Motion

- `src/components/SkillCard.tsx`
  - synthetic screenshot motion
  - synthetic cursor motion
  - synthetic zoom pulse

- `src/components/ProgressBar.tsx`
  - current progress overlay

## Data Schemas

- `src/lib/episode-types.ts`
  - current manifest-like episode schema
- `src/lib/types.ts`
  - telemetry-oriented schemas for recording/cursor data
  - not yet wired into the render path

## Public Assets

- `public/audio`
  - current prototype narration clips
- `public/screenshots`
  - current prototype screenshots
- `public/music`
  - background music

## New Docs Added For This Project

- `docs/architecture.md`
  - approved system direction
- `docs/repo_map.md`
  - quick file map
- `docs/plans/2026-03-23-daily-youtube-automation-design.md`
  - design record
- `docs/plans/2026-03-23-daily-youtube-automation-implementation.md`
  - execution plan
