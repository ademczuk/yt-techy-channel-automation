# Browser Control Capability Matrix

Generated: 2026-03-27

This matrix compares the strongest currently considered browser-control options for the `Code Search` automated YouTube workflow.

The target workflow is:

- browser window is visible and recordable
- cursor movement looks human enough on video
- tabs can switch reliably
- GitHub links and embedded demo videos can be clicked
- automation can attach to an existing browser/session instead of launching a second wrong window
- the whole thing can be wrapped in a deterministic harness with validation gates

## Summary Ranking

1. `Midscene + Playwright`
2. `Playwright-recording`
3. `browser-use`
4. `BrowserOS`
5. `agent-browser`

## Matrix

| Tool | Visible cursor in final recording | Real OS cursor | Can attach to existing/current browser | Reliable tab control | Click links/videos | Good harness fit | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Midscene | Likely yes when driving the real desktop/browser | Likely yes | Yes | Moderate to strong | Yes | Strong | Best fit for controlling the actual browser already being recorded. Docs support current-tab bridge mode and desktop mouse/keyboard actions. |
| Playwright-recording | Yes | No | Possible via existing Chromium/CDP path, but not the default skill flow | Strong | Yes | Very strong | Shows a visible cursor by injecting a cursor overlay into the page/video. Best deterministic browser logic. |
| browser-use | Not clearly documented as a visible cursor lane | No clear proof | Yes | Moderate | Yes | Moderate | Strong browser/session automation and can connect to real Chrome/profile, but not a proven visible-cursor recorder. |
| BrowserOS | Unclear | Unclear | Unclear from docs for current-session use | Moderate | Yes | Moderate | Promising AI-native browser, but not yet doc-proven for the exact recorded visible-cursor flow. |
| agent-browser | Not clearly documented | No clear proof | Session-oriented, but not current desktop tab attachment | Moderate | Yes | Moderate | Useful helper and can record browser video, but not yet a proven primary lane for creator-style visible-cursor demos. |

## Important Clarification

`Visible cursor in final recording` and `real OS cursor` are not the same thing.

- `Playwright-recording` can absolutely make the video show a cursor that appears to move naturally.
- But that cursor is a page-level injected overlay, not the actual Windows/macOS desktop cursor.
- For the YouTube output, that may still be good enough if it looks natural and can be restyled later in the recorder/editor.

## Tool Notes

### Midscene

Strengths:

- current-tab bridge mode
- desktop-style mouse and keyboard actions
- most aligned with the "record the real browser I already opened" workflow

Open question:

- should be smoke-tested to confirm exactly how the visible cursor looks inside a screen recording

### Playwright-recording

Strengths:

- strongest deterministic browser logic
- page/tab object model
- best verification hooks for URL/title/tab state
- explicit visible cursor overlay support in the installed skill

Weakness:

- not the real OS cursor

### browser-use

Strengths:

- can use real Chrome profiles and running sessions
- strong agent-oriented browser control

Weakness:

- less deterministic than Playwright for the core harness
- visible-cursor story is weaker than Playwright-recording and Midscene

### BrowserOS

Strengths:

- ambitious AI-native browser platform
- workflows and built-in agent ideas are attractive

Weakness:

- currently less proven for this exact "existing recorded browser + visible cursor + deterministic harness" use case

### agent-browser

Strengths:

- useful browser utility layer
- can record browser sessions to WebM

Weakness:

- not yet a proven premium creator-video lane in this project

## Recommendation

For the next practical test phase:

1. `Midscene` as the first candidate for a real visible desktop/browser cursor path
2. `Playwright-recording` as the current fallback if a fake-but-natural cursor is acceptable
3. `Playwright` should remain part of the harness/verification layer even if Midscene becomes the visible control layer

