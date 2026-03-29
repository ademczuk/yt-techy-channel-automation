# Recordly Automation Notes

## Purpose

This document captures what Recordly actually gives us for the `Code Search` pipeline so we can stop treating it like a mystery recorder and start using it as a controllable system.

The source references for this note are:

- `https://clawhub.ai/adisinghstudent/recordly-screen-recorder`
- `~/.codex/skills/recordly-screen-recorder/SKILL.md`
- `C:\YT\Code Search\recordly-test\electron\preload.ts`
- `C:\YT\Code Search\recordly-test\electron\ipc\handlers.ts`
- `C:\YT\Code Search\recordly-test\src\hooks\useScreenRecorder.ts`
- `C:\YT\Code Search\recordly-test\src\components\launch\LaunchWindow.tsx`
- `C:\YT\Code Search\recordly-test\src\components\video-editor\projectPersistence.ts`
- `C:\YT\Code Search\recordly-test\src\components\video-editor\types.ts`
- `C:\YT\Code Search\recordly-test\src\components\video-editor\VideoEditor.tsx`

## Bottom Line

Recordly is best understood as four things:

1. a source/window selector
2. a recording engine
3. a cursor telemetry collector
4. a project-based editor and exporter

It is not the browser automation brain by itself.

For this project, the clean model is:

- `Playwright` or another browser driver performs the GitHub walkthrough
- `Recordly` captures the selected browser window and stores cursor telemetry
- `Recordly` project state or our own automation writes the zoom/background/export decisions
- `Recordly` exports the finished source clip
- `Remotion` remains available for episode assembly, titles, and full-show packaging

## What Recordly Can Do Well

### 1. Record a Selected Window

Recordly explicitly supports choosing a single window source, not just a whole monitor.

Relevant IPC / UI surface:

- `getSources`
- `selectSource`
- `getSelectedSource`
- `showSourceHighlight`
- `startNativeScreenRecording`
- `startFfmpegRecording`

The launch window requests both `screen` and `window` sources and labels them separately.

Practical meaning for us:

- we should select the browser window, not the entire desktop
- if the browser stays in the same window, tab switches stay inside the captured source
- if a clicked link opens in the same browser window, the capture stays valid
- if a clicked link opens a different top-level window, we would lose that capture unless we reselect or force same-window behavior

### 2. Capture Real Cursor Telemetry

Recordly stores cursor telemetry as a sidecar file:

- `videoPath + ".cursor.json"`

Telemetry includes:

- `timeMs`
- normalized cursor position `cx`, `cy`
- interaction type:
  - `move`
  - `click`
  - `double-click`
  - `right-click`
  - `middle-click`
  - `mouseup`
- cursor visual type:
  - `arrow`
  - `text`
  - `pointer`
  - `crosshair`
  - `open-hand`
  - `closed-hand`
  - `resize-ew`
  - `resize-ns`
  - `not-allowed`

This is much better than fake motion because it lets the editor reconstruct where the cursor actually was and what it was doing.

### 3. Apply Editable Zoom Regions

Recordly’s editor state has first-class zoom support:

- `zoomRegions`
- `zoomInDurationMs`
- `zoomInOverlapMs`
- `zoomOutDurationMs`
- `connectedZoomGapMs`
- `connectedZoomDurationMs`
- `zoomInEasing`
- `zoomOutEasing`
- `connectedZoomEasing`
- `zoomMotionBlur`
- `connectZooms`

Each zoom region has:

- `id`
- `startMs`
- `endMs`
- `depth`
- `focus.cx`
- `focus.cy`

That means we can automate natural-looking zooms by writing focus windows around meaningful cursor events instead of relying on random camera pulses.

### 4. Save and Reopen Structured Projects

Recordly has a concrete project model:

- `EditorProjectData`
  - `version`
  - `videoPath`
  - `editor`

The `editor` block can store:

- wallpaper/background
- blur
- cursor settings
- crop
- zoom regions
- trim regions
- speed regions
- annotations
- audio regions
- captions
- webcam settings
- export format and quality

Relevant IPC methods:

- `saveProjectFile`
- `loadProjectFile`
- `loadCurrentProjectFile`
- `openProjectFileAtPath`
- `listProjectFiles`

This is the path to post-record automation. We do not need to hand-edit the UI forever if we can write project state cleanly.

## What Recordly Does Not Replace

Recordly does not decide where to browse on GitHub or what to click.

It still needs a driver for:

- opening the repo
- scrolling naturally
- opening README sections
- clicking links
- switching tabs
- playing embedded GitHub videos

That driver should remain `Playwright`.

The right mental model is:

- `Playwright` chooses and performs the walkthrough
- `Recordly` captures and post-processes it

## Tab Switching and Link Clicking

This was an important question from the user and the answer is mostly yes, with one guardrail.

If the selected source is the browser window:

- changing tabs inside that same browser window is fine
- opening a README link in the same tab is fine
- opening a new tab in the same browser window is still fine
- playing an embedded video on the page is fine

The main risk is opening a different top-level window that is not the selected source.

So the automation rules should be:

1. prefer same-window navigation
2. prefer same-window tab changes
3. if a link is likely to open externally, force browser behavior we control
4. avoid popup windows during automated capture

## Cursor Telemetry Strategy For Natural Videos

The cursor should not point at random things.

The clean system is:

1. script generator emits focus cues
   - heading text
   - README section ids or keyword targets
   - screenshot or walkthrough anchors

2. browser automation walks to those anchors
   - hover repo title
   - hover key README section
   - pause over install snippet
   - pause over demo gif/video

3. Recordly records the real cursor path

4. post-edit automation converts those pauses and clicks into zoom regions

That gives us cursor behavior that is relevant to the narration instead of decorative nonsense.

## Zoom Region Strategy

The zooms should be tied to actual moments of interest, not random intervals.

Good zoom triggers:

- a click on a primary README section
- hovering a feature list
- opening a demo or docs link
- focusing an install command
- playing a repo video or animated preview

Bad zoom triggers:

- arbitrary timers
- every scroll burst
- idle cursor movement
- constant in-and-out pumping

The automation target should be:

- fewer zooms
- longer dwell
- focus on important content blocks
- smooth transitions between nearby cues

## Recordly Editor Automation Opportunities

We should automate these editor decisions instead of doing them manually:

- set `showCursor`
- set `cursorStyle`
- set `cursorSmoothing`
- set `cursorMotionBlur`
- set `cursorClickBounce`
- set `cursorSway`
- set wallpaper/background
- set frame padding and border radius
- write zoom regions
- write trim regions
- write speed regions
- choose export format and quality

This means the long-term pipeline can be:

1. capture raw browser walkthrough
2. write or update a `.recordly` project
3. open or export that project

## Recommended Cursor Defaults

For this channel, the cursor should feel normal and understated.

Recommended initial defaults:

- `showCursor: true`
- `cursorStyle: "tahoe"` only if it looks close enough to a normal desktop pointer
- otherwise keep our own Windows-like pointer lane in Remotion as fallback
- `cursorSmoothing`: moderate, not floaty
- `cursorClickBounce`: low to moderate
- `cursorMotionBlur`: low
- `cursorSway`: low

The goal is:

- visible
- human
- precise
- not stylized for its own sake

## Recommended Automation Architecture

For the `Code Search` workflow, the most sensible architecture is:

### Lane A: Fast Daily Capture

- browser automation drives the GitHub walkthrough
- Recordly captures the selected browser window
- post-processing writes a light project state
- export yields a raw segment clip
- Remotion assembles the full episode

### Lane B: Higher-Touch Premium Capture

- browser automation drives longer, more curated flows
- Recordly captures the selected browser window
- project state adds richer zooms, trims, and maybe webcam/background treatment
- export yields higher-quality clips for battle and deep-dive videos

## Current Constraints

Right now, the main Recordly blocker in this environment is not conceptual. It is capture reliability on this Windows setup.

The earlier bad output came from source-selection mistakes, which are now understood.

The current known issue is:

- some Recordly runs still produce black captured output in this setup

That means the architecture is promising, but the Windows capture path still needs a focused root-cause pass before Recordly becomes the default capture engine.

## Practical Recommendation

Short term:

- keep `Playwright` as the browser driver
- keep current project capture and Remotion lane as backup
- continue treating Recordly as an active R&D capture/export lane

Medium term:

- solve the Windows black-capture issue
- automate project-file authoring for zoom/background/export settings
- switch premium capture to Recordly first

Long term:

- use Recordly as the main raw-screen capture and project-edit system
- use Remotion as the full-episode compositor and branding shell
