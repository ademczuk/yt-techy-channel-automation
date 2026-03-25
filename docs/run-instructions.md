# Run Instructions

## Why This Exists

`README.md` should stay focused on what the project is and how it is structured.

This file is the operator runbook for actually using the pipeline.

## README vs Run Instructions

### Keep in README

- project purpose
- architecture summary
- core file map
- high-level setup

### Keep in Run Instructions

- exact daily commands
- partial rerun commands
- resume behavior
- recovery steps
- config file expectations

## Daily Operator Flow

### 1. Collect candidates

```powershell
npx tsx scripts/collect-candidates.ts
```

### 2. Build the daily manifest

```powershell
npx tsx scripts/build-episode.ts
```

This step now enriches selected GitHub repos with cached README content under:

`runtime/episodes/<date>/readmes`

### 3. Capture screenshots

```powershell
npx tsx scripts/capture-screenshots.ts
```

Useful partial-run options:

```powershell
npx tsx scripts/capture-screenshots.ts --limit 1
npx tsx scripts/capture-screenshots.ts --start-at 4 --limit 3
```

Behavior:

- existing screenshots are reused by default
- use `runtime/capture-config.json` to override capture settings

### 4. Generate audio

```powershell
npx tsx scripts/generate-audio.ts
```

Useful partial-run options:

```powershell
npx tsx scripts/generate-audio.ts --limit 2
npx tsx scripts/generate-audio.ts --start-at 3 --limit 2
npx tsx scripts/generate-audio.ts --overwrite
```

Requires:

- `runtime/voice-config.json`
  or
- `ELEVENLABS_API_KEY`

### 5. One-command runner

```powershell
npx tsx scripts/run-daily.ts
```

Examples:

```powershell
npx tsx scripts/run-daily.ts --limit 1
npx tsx scripts/run-daily.ts --skip-audio
npx tsx scripts/run-daily.ts --screenshot-limit 2 --audio-limit 2
```

## Config Files

Start from these templates:

- `runtime/templates/source-config.example.json`
- `runtime/templates/capture-config.example.json`
- `runtime/templates/voice-config.example.json`

Copy them into:

- `runtime/source-config.json`
- `runtime/capture-config.json`
- `runtime/voice-config.json`

## Repeatability Notes

- README enrichment is cached on disk
- screenshot generation reuses existing files unless overwrite is enabled
- screenshot generation supports partial reruns
- audio generation supports partial reruns
- these behaviors are intended to map cleanly to future dashboard buttons
