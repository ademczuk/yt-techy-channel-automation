# Screen Demo Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a project-local Codex skill and harness for `plan -> record -> edit -> render` screen demos.

**Architecture:** A deterministic TypeScript harness owns project creation, artifact writing, edit calculations, and Remotion rendering. Steel plus Playwright act as the recording adapter. The skill documents the workflow and expected artifacts.

**Tech Stack:** TypeScript, Node.js, Playwright, Steel SDK, Remotion, Zod

---

### Task 1: Add Core Types And Harness Helpers

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\screen-demo-types.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\screen-demo-harness.ts`
- Test: `C:\YT\Code Search\clawhub-weekly-master\tests\screen-demo-harness.test.ts`

### Task 2: Add Steel Recording Adapter

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\lib\screen-demo-steel.ts`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\package.json`

### Task 3: Add Remotion Composition

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\src\compositions\ScreenDemoComposition.tsx`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\src\Root.tsx`

### Task 4: Add CLI Entry Points

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\scripts\screen-demo.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\scripts\render-screen-demo.ts`
- Create: `C:\YT\Code Search\clawhub-weekly-master\scripts\setup-screen-demo.ts`
- Modify: `C:\YT\Code Search\clawhub-weekly-master\package.json`

### Task 5: Add Skill And Env Template

**Files:**
- Create: `C:\YT\Code Search\clawhub-weekly-master\.codex\skills\screen-demo-pipeline\SKILL.md`
- Create: `C:\YT\Code Search\clawhub-weekly-master\runtime\templates\screen-demo.env.example`

### Task 6: Verify

**Files:**
- Test: `C:\YT\Code Search\clawhub-weekly-master\tests\screen-demo-harness.test.ts`

Run:
- `npm test`
- `npm run build`
- `npm run screen-demo:setup`
