# ClawHub Weekly

![Remotion](https://img.shields.io/badge/remotion-4.x-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)
![No API Keys](https://img.shields.io/badge/API%20keys-none%20required-purple)

Automated YouTube video pipeline for **OpenClaw Skills Weekly** — a data-driven weekly roundup of trending skills on [ClawHub.ai](https://clawhub.ai). Built with [Remotion](https://www.remotion.dev/) for React-based video composition.

## What This Is

An automated YouTube video pipeline for weekly **OpenClaw Skills Weekly** episodes. It collects trending skills from both **ClawHub.ai** and **GitHub Trending**, ranks and enriches them, generates TTS narration via ElevenLabs, captures full-page screenshots, and renders the final video with Remotion.

A static Episode 2 fixture (15 pre-baked ClawHub skills) ships with the repo for quick renders without running the collection pipeline.

## Requirements

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 18+ (LTS recommended) | `node -v` |
| npm | 8+ (ships with Node 18) | `npm -v` |

No other system dependencies. Remotion auto-downloads Chrome Headless Shell on first render (~108MB, one-time).

### Platform Notes

- **Windows**: Works in PowerShell, Git Bash, or WSL. Avoid cloning into paths with spaces.
- **macOS**: No Xcode required. Works on both Intel and Apple Silicon.
- **Linux**: May need `libnss3` and `libatk-bridge2.0-0` for headless Chrome if on a minimal distro.

## Quick Start

```bash
git clone https://github.com/ademczuk/clawhub-weekly.git
cd clawhub-weekly
npm install
npm run render
```

Output: `out/clawhub-weekly.mp4` (~131MB, 5:42, 1920x1080, 30fps, H.264)

First render takes ~6 minutes (includes Chrome download). Subsequent renders: ~5 minutes.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run studio` | Open Remotion Studio — live preview, scrub through scenes, inspect props |
| `npm run render` | Render full episode to MP4 |
| `npm run render -- --output custom.mp4` | Custom output path |
| `npm run render -- --crf 18` | Adjust quality (lower CRF = higher quality, bigger file) |
| `npm run build` | Bundle Remotion project without rendering |

## Video Structure (5:42)

```
Intro (17s) → Ecosystem Pulse (14s) → Movers Header (7s) → 10 Skills (~3min)
→ Rockets Header (5s) → 5 Skills (~1.5min) → Outro (13s)
```

Each skill scene includes:
- Full-page screenshot with chunked scroll (4 scroll-pause bursts, quartic ease-out)
- Bezier cursor movement following natural reading patterns
- Female AI narration (OpenAI Nova voice, pre-rendered)
- Persistent bottom bar: author, downloads, stars, weekly deltas
- Ambient background music at 12% volume

## Live Pipeline

Run the full collection-to-video pipeline:

```bash
npx tsx scripts/run-daily.ts
```

Or with skip flags:

```bash
npx tsx scripts/run-daily.ts --skip-screenshots --skip-audio  # manifest only
npx tsx scripts/run-daily.ts --skip-render                    # no video render
```

### Pipeline Steps

| Step | Script | Description |
|------|--------|-------------|
| Collect | `scripts/collect-candidates.ts` | Fetches ClawHub skills + GitHub Trending |
| Build | `scripts/build-episode.ts` | Ranks, enriches, writes manifest + `latest` junction |
| Screenshots | `scripts/capture-screenshots.ts` | Full-page captures via Playwright |
| Audio | `scripts/generate-audio.ts` | ElevenLabs TTS narration |
| Render | `render.ts` | Remotion H.264 video |

### ClawHub Source

`src/lib/clawhub-source.ts` uses a 3-tier fallback to collect skills:
1. Scrape `clawhub.ai/skills` directly
2. Run `npx clawhub@latest search '*' --json` via CLI
3. Return static seed list from Episode 2 fixture

ClawHub skills get a **+15 score bonus** in ranking so they surface above generic GitHub repos in mixed collections.

### Source Config

Copy `runtime/templates/source-config.example.json` to `runtime/source-config.json` to override defaults:

```json
{
  "githubTrending": { "enabled": true, "since": "daily", "language": "" },
  "clawhub": { "enabled": true, "limit": 30 }
}
```

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Root.tsx     │────▶│  Remotion     │────▶│  out/        │
│  (hardcoded   │     │  Renderer     │     │  clawhub-    │
│   episode     │     │  (bundle →    │     │  weekly.mp4  │
│   data)       │     │   render)     │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
        │
        ▼
  public/audio/          20 narration MP3s
  public/screenshots/    15 full-page PNGs
  public/music/          background music
```

## Project Structure

```
clawhub-weekly/
├── render.ts                     # Single-command renderer (bundle → selectComposition → render)
├── remotion.config.ts            # Remotion output settings
├── src/
│   ├── index.ts                  # Entry point — registers RemotionRoot
│   ├── Root.tsx                  # Composition + hardcoded Episode 2 data (edit this to change content)
│   ├── compositions/
│   │   └── SkillsWeekly.tsx      # Main orchestrator — sequences all scenes with audio-driven timing
│   ├── scenes/
│   │   ├── IntroScene.tsx        # "Welcome to Skills Weekly..." animated title
│   │   ├── EcosystemPulseScene.tsx  # Platform stats dashboard (skills, downloads, growth)
│   │   ├── SectionHeaderScene.tsx   # "Top Movers" / "Rockets" title cards
│   │   ├── SkillScene.tsx           # Per-skill card with screenshot, narration, stat bar
│   │   └── OutroScene.tsx           # Subscribe CTA + credits
│   ├── components/
│   │   ├── SkillCard.tsx         # Screenshot scroll animation + Bezier cursor
│   │   └── ProgressBar.tsx       # Bottom progress indicator
│   └── lib/
│       ├── episode-types.ts      # Zod schemas for episode data
│       └── types.ts              # Shared type definitions
└── public/
    ├── audio/                    # 20 MP3s (15 skill + 5 scene narrations)
    ├── screenshots/              # 15 PNGs (full-page ClawHub skill captures)
    └── music/                    # ambient-bed.mp3
```

## Development

```bash
npm run studio          # Opens Remotion Studio at localhost:3000
```

Operator workflow lives in [`docs/run-instructions.md`](docs/run-instructions.md).

In Studio you can:
- Scrub through any frame
- Inspect component props
- Preview individual scenes
- Test changes in real-time before full render

### Changing Episode Data

All data lives in `src/Root.tsx` → `EPISODE_DATA`. Key fields per skill:

| Field | Purpose |
|-------|---------|
| `displayName` | Shown on screen |
| `script` | Text the AI voice reads |
| `audioPath` | Pre-rendered narration MP3 |
| `audioDurationMs` | Controls scene duration |
| `screenshotPath` | Full-page PNG capture |
| `screenshotHeight` | Pixel height for scroll calculation |
| `downloads`, `stars` | Stats shown on bottom bar |
| `downloadsDelta` | Weekly change (+/- indicator) |

Duration is computed automatically from audio lengths (see `calculateMetadata` in Root.tsx).

### Adding a New Scene

1. Create component in `src/scenes/NewScene.tsx`
2. Import and add it to the `Series` in `src/compositions/SkillsWeekly.tsx`
3. Preview in Studio, then render

## Troubleshooting

**"EncodingError: The source image cannot be decoded"**
Non-blocking warning from Chromium parallel tab rendering. All screenshots render correctly. Ignore it.

**First render is very slow**
Chrome Headless Shell downloads once (~108MB). After that, renders take 4-6 minutes.

**"Cannot find module" errors**
Run `npm install` again. Requires Node 18+ — check with `node -v`.

**Video has no audio**
Verify `public/audio/` has 20 MP3 files and `public/music/` has `ambient-bed.mp3`. If missing, re-clone the repo.

**Out of memory on long renders**
Increase Node heap: `NODE_OPTIONS=--max-old-space-size=4096 npm run render`

### Clean Reset

```bash
rm -rf node_modules out .remotion
npm install
```

## Credits

- Data sourced from [ClawHub.ai](https://clawhub.ai) by [OpenClaw](https://github.com/openclaw)
- Video pipeline by [@ademczuk](https://github.com/ademczuk)
- Produced for the channel owner

## License

MIT
