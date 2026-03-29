# ClawHub Weekly — Handover

**Repo:** https://github.com/ademczuk/clawhub-weekly

## What This Is

A self-contained Remotion video pipeline that renders Episode 2 of **OpenClaw Skills Weekly** — a 5:42 YouTube video showcasing 15 trending ClawHub skills (10 movers + 5 rockets). Female AI narration from the first second, ambient background music, full-page screenshot scroll animations with cursor movement, ecosystem pulse dashboard, and persistent stat bars.

## Prerequisites

- **Node.js 18+** (LTS recommended) — check with `node -v`
- **npm 8+** (ships with Node 18) — check with `npm -v`
- **No API keys needed** — all audio, screenshots, and episode data are pre-baked in the repo
- **No ffmpeg needed** — Remotion bundles its own encoder
- Repo includes an `.nvmrc` file, so if you use nvm: `nvm use` will set the right version

### Platform Notes

| Platform | Notes |
|----------|-------|
| **Windows** | Works in PowerShell, Git Bash, or WSL. Avoid paths with spaces. |
| **macOS** | No Xcode required. Works on Intel and Apple Silicon. |
| **Linux** | Minimal distros may need: `sudo apt install libnss3 libatk-bridge2.0-0` for headless Chrome. |

## Quick Start

```bash
git clone https://github.com/ademczuk/clawhub-weekly.git
cd clawhub-weekly
npm install
npm run render
```

Output lands at `out/clawhub-weekly.mp4` (~131MB, 5:42, 1920x1080, 30fps, H.264).

First render downloads Chrome Headless Shell (~108MB, one-time) and takes ~5-6 minutes depending on machine. Subsequent renders skip the download.

## Available Commands

| Command | What it does |
|---------|-------------|
| `npm run studio` | Opens Remotion Studio in browser — live preview, scrub through scenes, inspect props |
| `npm run render` | Renders full episode to MP4 |
| `npm run render -- --output my-video.mp4` | Custom output path |
| `npm run render -- --crf 18` | Higher quality (lower CRF = bigger file, default is 18) |
| `npm run build` | Bundle only (no render) |

Operator runbook: see `docs/run-instructions.md`

## What's In The Box

```
clawhub-weekly/
├── render.ts                 # Single-command renderer (bundle -> render -> done)
├── src/
│   ├── Root.tsx              # Episode 2 data hardcoded here (all 15 skills, scripts, paths)
│   ├── compositions/
│   │   └── SkillsWeekly.tsx  # Main composition — orchestrates all scenes in sequence
│   ├── scenes/
│   │   ├── IntroScene.tsx        # "Welcome to Skills Weekly..." with animated text
│   │   ├── EcosystemPulseScene.tsx  # Platform stats dashboard (13,345 skills, downloads, etc.)
│   │   ├── SectionHeaderScene.tsx   # "Top Movers" / "Rockets" title cards
│   │   ├── SkillScene.tsx           # Per-skill card with screenshot scroll + cursor
│   │   └── OutroScene.tsx           # Subscribe CTA + credits
│   ├── components/
│   │   ├── SkillCard.tsx     # Fullscreen screenshot with chunked scroll + Bezier cursor
│   │   └── ProgressBar.tsx   # Bottom progress indicator
│   └── lib/
│       ├── episode-types.ts  # Zod schemas for episode data
│       └── types.ts          # Shared types
└── public/
    ├── audio/                # 20 MP3s — 15 skill narrations + 5 scene narrations
    ├── screenshots/          # 15 PNGs — full-page captures of each skill's ClawHub page
    └── music/                # ambient-bed.mp3 — background music track
```

## Video Structure (5:42 total)

| Scene | Duration | Description |
|-------|----------|-------------|
| Intro | ~17s | Episode title, skill count, platform stats |
| Ecosystem Pulse | ~14s | Animated dashboard — total skills, downloads, weekly growth |
| Movers Header | ~7s | "Top Movers" title card |
| 10 Mover Skills | ~3min | Per-skill: screenshot scroll, narration, stat bar |
| Rockets Header | ~5s | "Rockets" title card |
| 5 Rocket Skills | ~1.5min | Per-skill: screenshot scroll, narration, stat bar |
| Outro | ~13s | Subscribe CTA, credits, links |

Each skill scene includes:
- Full-page screenshot with chunked scroll animation (4 scroll-pause bursts)
- Bezier cursor movement following natural reading patterns
- Female AI narration describing what the skill does
- Persistent bottom bar showing author, downloads, stars, and weekly deltas
- Ambient background music at 12% volume throughout

## Customizing Episode Data

All episode data lives in `src/Root.tsx` in the `EPISODE_DATA` constant. To swap in different skills or scripts, edit that object directly. Key fields per skill:

```typescript
{
  slug: "skill-name",           // URL-safe identifier
  displayName: "Skill Name",    // Shown on screen
  script: "Narration text...",  // What the AI voice reads
  audioPath: "audio/skill.mp3", // Pre-rendered narration (relative to public/)
  audioDurationMs: 20112,       // Controls scene duration
  screenshotPath: "screenshots/skill.png",  // Full-page capture
  screenshotHeight: 17967,      // Pixel height for scroll calculation
  downloads: 84448,             // Stats shown on bottom bar
  stars: 1004,
  downloadsDelta: 2282,         // Weekly change shown as +/- indicator
  // ... more fields in episode-types.ts
}
```

The `calculateMetadata` function in `Root.tsx` automatically computes total video duration from audio clip lengths (with 1-second padding per scene).

## Troubleshooting

### "EncodingError: The source image cannot be decoded"
Non-blocking warning. Chromium race condition with parallel tab image loading. All 15 screenshots render correctly — ignore these.

### Render takes longer than expected
First render downloads Chrome Headless Shell (~108MB). If your connection is slow, this can take a while. Subsequent renders skip the download. The actual frame rendering takes 4-6 minutes on a modern machine.

### "Cannot find module" errors
Run `npm install` again. If using Node 16 or below, upgrade to Node 18+.

### Video has no audio
Check that `public/audio/` contains 20 MP3 files and `public/music/` contains `ambient-bed.mp3`. These ship with the repo — if missing, re-clone.

### Out of memory
Increase Node heap: `NODE_OPTIONS=--max-old-space-size=4096 npm run render`

### Clean reset
```bash
rm -rf node_modules out .remotion
npm install
```

## Development Workflow

To preview and iterate without doing a full render:

```bash
npm run studio     # Opens Remotion Studio at localhost:3000
```

In Studio you can scrub through any frame, inspect props, and preview changes in real-time. When satisfied, run `npm run render` for the final MP4.

### Adding a new scene
1. Create component in `src/scenes/NewScene.tsx`
2. Import and add to the `Series` in `src/compositions/SkillsWeekly.tsx`
3. Preview in Studio, then full render

## Repo Transfer

This repo is currently under `ademczuk`. To move it to your account:

1. Go to https://github.com/ademczuk/clawhub-weekly/settings
2. Scroll to **Danger Zone**
3. Click **Transfer repository**
4. Enter the new owner for the destination account

Or simply fork it to your own account.

## Tech Stack

- **[Remotion](https://www.remotion.dev/)** 4.x — React-based video composition framework
- **React 18** — UI components for each scene
- **Zod 4.3.6** — Runtime schema validation for episode data
- **tsx** — TypeScript execution for the render script
- **OpenAI TTS** (Nova voice) — Used to generate the pre-baked audio files (not needed at render time)

## Credits

- Data sourced from [ClawHub.ai](https://clawhub.ai) by [OpenClaw](https://github.com/openclaw)
- Video pipeline by [@ademczuk](https://github.com/ademczuk)
- Produced for the channel owner
