# Browser Recording Recovery Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore a reliable two-repo browser walkthrough flow for Cursorful and similar recorders without relying on blind desktop clicks.

**Architecture:** Keep browser navigation deterministic in Playwright, keep the browser window prepared before recording starts, and treat the recorder as a human-operated capture layer unless and until its editor/export flow is proven stable. The fix is not “more retries”; it is removing the mismatch between a single-page walkthrough helper and a multi-tab recording expectation.

**Tech Stack:** Playwright, Chrome CDP, PowerShell window activation, Remotion, Cursorful/Recordly capture apps

---

## Verified Findings

1. **The original handoff repo was never a real live-capture system.**
   - Evidence: `HANDOVER.md` says the episode shipped with pre-baked screenshots and pre-baked audio.
   - Meaning: the old “working” version looked polished because it was rendering fixed assets, not driving four GitHub tabs live.

2. **The current `test-playwright-recording.ts` only records one repo.**
   - Evidence: `scripts/test-playwright-recording.ts` hardcodes `repoUrl: "https://github.com/bytedance/deer-flow"` and one `repoSlug`.
   - Meaning: the current “working” browser lane was only ever validated for one page.

3. **The current walkthrough helper is page-centric, not tab-centric.**
   - Evidence: `scripts/lib/github-walkthrough.ts` accepts one `page` and one `repoUrl`; it never manages multiple tabs or verifies visible tab changes.
   - Meaning: when used in a multi-repo recording, it can easily keep operating on the same visible page.

4. **The failed manual recording passes used the wrong control method.**
   - Evidence: prior live runs used OS-level keyboard/mouse assumptions rather than verified Playwright tab activation.
   - Meaning: tab switches were not confirmed on screen before scrolling and hovering continued.

5. **The debuggable Chrome session did not contain the intended repo tabs.**
   - Evidence: `http://127.0.0.1:9222/json/list` showed unrelated tabs and did not include the expected GitHub repo set.
   - Meaning: even correct browser control could not switch to tabs that did not actually exist in that session.

---

## Task 1: Lock the Control Model

**Files:**
- Modify: `C:\YT\Code Search\clawhub-weekly-master\scripts\lib\github-walkthrough.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\scripts\lib\github-tab-session.ts`
- Test: `C:\YT\Code Search\clawhub-weekly-master\tests\github-tab-session.test.ts`

**Step 1: Write the failing test**

Create a test that asserts:
- a two-repo session creates two tabs
- each tab can be activated explicitly
- the active page URL matches the expected repo URL before walkthrough starts

**Step 2: Run test to verify it fails**

Run: `npm test -- github-tab-session`

Expected: fail because the tab-session helper does not exist yet.

**Step 3: Write minimal implementation**

Create a helper that:
- opens the exact repo list
- stores `Page` objects by slug
- exposes `activateRepoTab(slug)`
- verifies `page.url()` contains the expected repo path after activation

**Step 4: Run test to verify it passes**

Run: `npm test -- github-tab-session`

Expected: pass.

---

## Task 2: Separate “prepare tabs” from “perform walkthrough”

**Files:**
- Modify: `C:\YT\Code Search\clawhub-weekly-master\scripts\lib\github-walkthrough.ts`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\scripts\test-playwright-recording.ts`

**Step 1: Write the failing test**

Add a test that fails if `runGitHubWalkthrough()` is responsible for navigation.

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: fail because `runGitHubWalkthrough()` still calls `prepareGitHubRepo()`.

**Step 3: Write minimal implementation**

Refactor so:
- tab/session helper opens the repos
- walkthrough helper only operates on the already-active page
- navigation and tab activation happen outside the walkthrough helper

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: pass.

---

## Task 3: Build a true two-repo Playwright demo first

**Files:**
- Modify: `C:\YT\Code Search\clawhub-weekly-master\scripts\test-playwright-recording.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\runtime\tests\...\playwright-recording\session-manifest.json`

**Step 1: Write the failing test**

Add a tiny smoke assertion that the demo output must include:
- two cue files
- one manifest naming both repos

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: fail because the current script only outputs one repo.

**Step 3: Write minimal implementation**

Make the Playwright test script:
- open both repos in separate tabs
- activate repo A, verify title/url, run walkthrough
- activate repo B, verify title/url, run walkthrough
- write both cue files and a session manifest

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: pass.

---

## Task 4: Use Cursorful only as the capture shell

**Files:**
- Modify: `C:\YT\Code Search\clawhub-weekly-master\scripts\test-cursorful-raw.ts`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\scripts\test-cursorful.ts`

**Step 1: Write the failing test**

Add a config/unit check that forbids:
- keyboard-based tab switching assumptions
- automatic relaunch when Cursorful is already open

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: fail because the current script still launches Cursorful directly and mixes recorder control with browser orchestration.

**Step 3: Write minimal implementation**

Change the Cursorful flow to:
- assume browser tabs are already prepared
- assume recording may be started/stopped manually
- only drive the browser pages during the recording
- stop using `Ctrl+1/2/3/4` logic entirely

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: pass.

---

## Task 5: Keep manual recording as the default until export is trustworthy

**Files:**
- Modify: `C:\YT\Code Search\clawhub-weekly-master\docs\run-instructions.md`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\docs\architecture.md`

**Step 1: Update the operator docs**

Document the safe default:
- prepare repo tabs first
- user starts recording
- Playwright drives the browser tabs
- user stops and exports
- Remotion packages the exported clip

**Step 2: Add “do not trust auto-export yet” note**

Explicitly mark Cursorful and Recordly editor/export automation as experimental until stable.

**Step 3: Verify docs**

Open both docs and confirm they reflect the current safe workflow.

---

## Success Criteria

The recovery is complete when:

- a two-repo Playwright walkthrough works without blind keyboard tab switching
- each repo transition is verified before motion continues
- the manual recording path reliably captures both repos in one take
- the operator docs match the real safe workflow instead of the aspirational one
