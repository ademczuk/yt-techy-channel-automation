---
name: screen-demo-thumbnail-creation
description: Use when the covered repos and episode angle are known and the workflow needs a thumbnail concept or generated thumbnail after the episode topic is locked.
---

# Screen Demo Thumbnail Creation

## Overview

Use this project-local skill after source selection and repo research, once the episode hook is known.

## Rules

- Do not create the thumbnail before the episode angle is locked.
- Base the thumbnail on the winning promise, not generic “AI demo” visuals.
- Reuse the existing image and style skills instead of inventing a second thumbnail lane.

## Supporting Skills

- Use `$image-graphic-workflow` for the concept and export spec.
- Use `$visual-style` for consistent design language.
- Use `$gpt-image-1-5` if a generated thumbnail asset is needed.

## Current Boundary

- This skill is documented and ready for orchestration.
- Thumbnail generation is not yet auto-wired into `npm run screen-demo`.
