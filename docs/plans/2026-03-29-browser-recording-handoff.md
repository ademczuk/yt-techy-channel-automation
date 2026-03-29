## Browser Recording Handoff

### Goal

Build a localhost app and skill-driven pipeline that can produce polished YouTube videos about GitHub projects:

- research repos
- write script
- generate audio
- record browser actions with real-looking cursor movement
- click links and optionally play demo videos
- trim dead time
- package the result in Remotion

The reason real browser interaction matters is YouTube repetition risk. We do not want a fake screenshot slideshow with simulated cursor movement only. We want real page changes, real link clicks, and ideally real media playback so the output is visibly more transformed and less repetitive.

This also matters because tools like `Recordly` and `Cursorful` can smooth real mouse movement, add zoom treatment, and provide premium-looking recording polish if we can give them a real browser session to capture.

### Tutorial Reference

Reference video:

- [Claude Code Can Make Screen Recordings Now?](https://www.youtube.com/watch?v=OWVL7-Nggoc)

What the video is describing:

- a `plan -> record -> edit -> render` skill
- browser access via `Steel`
- action log written to `moments.json`
- dead-time trimming around actions
- camera keyframes for smooth zooms
- final rendering in `Remotion`
- combining the screen-demo skill with other skills after the base clip is generated

Important points from the transcript:

- trim each clip from about `500ms` before an action to about `1000ms` after it
- merge clips if they are less than `2s` apart
- split clips if there is more than `3s` of inactivity
- camera config should decide:
  - what to focus on
  - what to zoom in on
  - how long to stay zoomed in

### Tools And Skills We Tried

#### Playwright

What it is supposed to do:

- deterministic browser control
- handle tabs, selectors, clicks, waits, and navigation

What it did well:

- strong DOM-aware control
- good for exact tab and selector verification

What it did not do well in our earlier harness:

- we mistakenly launched new browser windows instead of attaching to the same recorded one
- it does not give a real OS cursor by itself
- its visible cursor lane is an overlay, not the actual desktop cursor

Conclusion:

- good browser brain
- not sufficient by itself for the “real cursor in recording” goal

#### Playwright Recording Skill

What it is supposed to do:

- show a visible cursor in the recording and record browser interactions

What it actually does:

- uses an injected cursor overlay
- useful if “looks like a cursor” is enough

Limitation:

- not the real OS cursor

#### Steel

What it is supposed to do:

- provide cloud browser sessions
- provide recording and replay export

What it actually does:

- browser/session infrastructure and recording host
- not the full task planner by itself

Important clarification:

- Steel still needs a driver layer telling it what to do
- that driver can be `Playwright`, `Puppeteer`, `browser-use`, or our own code

What worked:

- session creation
- recording export to `recording.mp4`
- `systemCursor: true`
- `humanizeInteractions: true`

What did not work cleanly:

- our first Steel lane used `Playwright` and hit a CDP attach problem around download behavior
- we replaced that executor with `Puppeteer`

Current status:

- Steel-based screen-demo pipeline works end to end
- cursor is visible in raw recordings
- still not good enough visually for final production

#### Puppeteer

What it is supposed to do:

- drive the Steel browser session without the Playwright CDP conflict

What it did:

- resolved the Steel attach issue
- let the pipeline record again

Current limitation:

- the browser moves, but the resulting cursor behavior still does not feel reliably human enough in the final output

#### Midscene

What it is supposed to do:

- vision-driven desktop control with real mouse movement

What it did well:

- could move the real mouse
- could connect to the desktop

What blocked it:

- hosted model compatibility and throttling issues
- Gemini free-tier `429` rate limits
- slower screenshot -> think -> act loop
- too much latency for smooth browser walkthrough videos

Conclusion:

- promising for desktop automation
- too slow/unreliable for this recorded browser use case right now

#### Webreel

What it is supposed to do:

- record scripted browser demos with a code-driven config

What happened:

- config and dry-run were valid
- on Windows it produced a nominal `30 fps` output path but actual motion was much lower
- effective motion felt more like `8-11 fps`

Conclusion:

- not good enough as the main capture lane on this Windows setup

#### Recordly

What it is supposed to do:

- capture a selected window
- collect real cursor telemetry
- support zoom regions, trims, and export

What we found:

- conceptually very strong for premium capture
- fits the “record a real browser window and polish it” idea very well
- but earlier Windows capture attempts produced black output in this environment

Conclusion:

- still an important lane
- but capture reliability was not ready yet

#### Cursorful

What it is supposed to do:

- premium screen recording and cursor smoothing/editor polish

Why it matters:

- if we can drive a real browser window cleanly, Cursorful/Recordly can make it look more premium than us trying to fake every zoom and motion ourselves

Status:

- considered as a recorder/editor shell
- not used as the deterministic browser brain

#### agent-browser / browser-use / BrowserOS / Midscene research

High-level finding:

- these are helpful for browser or desktop control research
- but the strongest practical split for this repo stayed:
  - browser/session brain
  - recorder/editor shell

### What We Built In This Repo

We built a project-local screen-demo system in:

- `scripts/screen-demo.ts`
- `scripts/render-screen-demo.ts`
- `scripts/setup-screen-demo.ts`
- `src/lib/screen-demo-harness.ts`
- `src/lib/screen-demo-steel.ts`
- `src/lib/screen-demo-remotion.ts`
- `src/compositions/ScreenDemoComposition.tsx`

Project-local skills were added under:

- `.codex/skills/screen-demo-*`

### Current Architecture

Current implemented lane:

1. `screen-demo-source-selection`
2. `screen-demo-repo-research`
3. `screen-demo-title-authoring`
4. `screen-demo-description-authoring`
5. `screen-demo-thumbnail-creation`
6. `screen-demo-script-authoring`
7. `text-to-speech` when enabled
8. `screen-demo-recording-plan`
9. `screen-demo-pipeline`
10. `screen-demo-qa`

The currently proven code path is narrower:

1. script draft
2. recording plan
3. Steel recording
4. Remotion trim + camera pass
5. final render

### Skills Built For This Pipeline

Project-local skills currently in the repo:

- `screen-demo-source-selection`
- `screen-demo-repo-research`
- `screen-demo-title-authoring`
- `screen-demo-description-authoring`
- `screen-demo-thumbnail-creation`
- `screen-demo-script-authoring`
- `screen-demo-recording-plan`
- `screen-demo-motion-orchestration`
- `screen-demo-remotion-trim`
- `screen-demo-final-package`
- `screen-demo-qa`
- `screen-demo-master-orchestrator`

### What We Fixed Along The Way

- dead-time trimming now uses action spans instead of just point timestamps
- timing is normalized to real recording duration to avoid black tails
- Remotion now rebases clips contiguously instead of leaving source-time gaps
- camera logic was changed from one clip-wide zoom to selective zoom windows
- cursor routing was adjusted to avoid crossing GitHub’s top navigation
- smooth scrolling behavior improved and should remain part of the motion skill

### Where We Are Still Stuck

Main blocker:

- the final cursor behavior is still not convincingly moving the way we want in the finished demo

More specifically:

- raw recordings can show a visible cursor
- but the final output still does not reliably feel like a human is actively browsing
- the movement is still not yet strong enough to trust for production YouTube output

Secondary issue:

- our custom Remotion zooming is useful as a fallback, but it is probably not the best long-term answer
- ideally we would record a real browser session with real cursor movement, then let a tool like `Recordly` or `Cursorful` smooth and stylize it

### Why Real Computer Movement Should Be Feasible

It should be feasible to automate actual cursor movement on a computer with real mouse travel and real clicks.

Why we want that:

- click links inside GitHub READMEs
- open other pages
- play embedded or linked demo videos
- show actual page changes
- avoid output that looks like static screenshots with fake cursor movement

That would make the videos more credible and less likely to look repetitive.

### Best Current Direction

The most promising long-term direction appears to be:

- deterministic browser/session control for what to click
- real desktop or browser-window capture for actual cursor movement
- use `Recordly` or `Cursorful` as the premium smoothing/editor shell if their capture path becomes reliable
- keep `Remotion` as the final packaging and episode compositor

