---
name: human-browser-walkthrough
description: Project-local Codex skill for visibly controlling a browser walkthrough with a human-looking cursor overlay, smooth movement, and natural scrolling across GitHub repos.
---

# Human Browser Walkthrough

Use this project-local skill when Codex should control a visible browser window itself for creator-style walkthrough footage without relying on Recordly, Cursorful, or Midscene.

## What It Does

- launches a visible Chromium window
- navigates through the configured GitHub repos in sequence
- injects a visible pointer overlay into the page
- moves the pointer in a human-looking path
- scrolls the README areas naturally enough for creator demo footage
- this skill remains the overlay-cursor lane; if a real OS mouse is required, use the live Playwright recording lane instead

## Command

```powershell
Set-Location "C:\YT\Code Search\clawhub-weekly-master"
npm run capture:live:human -- --start-delay-ms=5000 --per-repo-seconds=12
```

## Notes

- This is a project-local skill, not a global one.
- The visible cursor is an injected browser overlay, not the real OS cursor.
- It is meant for direct browser control by Codex when a believable visible mouse is enough for the recording.
