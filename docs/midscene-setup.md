# Midscene Setup

Installed skill:

- `~/.codex/skills/desktop-computer-automation-midscene/SKILL.md`

Local onboarding artifacts:

- `C:\YT\Code Search\skill-onboarding\desktop-computer-automation-midscene-onboard-20260326-1`

## What Midscene Needs

Midscene does not magically use the Codex model session. It runs as its own desktop-automation CLI and still needs a model API configured on this machine.

Use these values for OpenAI:

```env
MIDSCENE_MODEL_API_KEY=your_openai_key
MIDSCENE_MODEL_BASE_URL=https://api.openai.com/v1
MIDSCENE_MODEL_NAME=gpt-4o-2024-11-20
MIDSCENE_MODEL_FAMILY=openai
```

Template:

- `C:\YT\Code Search\clawhub-weekly-master\runtime\templates\midscene.env.example`

Recommended local config path:

- `C:\YT\Code Search\clawhub-weekly-master\runtime\midscene.env`

## Quick Verify

Run:

```powershell
Set-Location "C:\YT\Code Search\clawhub-weekly-master"
.\scripts\test-midscene-connect.ps1
```

If it succeeds, Midscene is ready for desktop use.

## Why This Helps

Midscene is better aligned with the human-style flow for desktop tools like Cursorful:

1. Bring the right window to the front first
2. Let Midscene work from screenshots of what is visible
3. Give one higher-level action instead of brittle low-level clicks

That matches the way you described using Cursorful much more closely than the DOM-heavy approach.
