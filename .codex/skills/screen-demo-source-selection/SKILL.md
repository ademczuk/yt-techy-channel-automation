---
name: screen-demo-source-selection
description: Use when a screen-demo episode needs candidate repos or resources selected from trending inputs or other source lists before writing any metadata or script.
---

# Screen Demo Source Selection

## Overview

Use this project-local skill to decide what the episode will cover before any title, description, thumbnail, or script is written.

## Rules

- Source selection comes first.
- Use current repo discovery and ranking logic before writing creator-facing assets.
- Prefer tools with clear product value, strong English-ready summaries, and real audience fit.
- Do not let title or thumbnail ideas decide the source list.

## Current Files

- [github-trending.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/github-trending.ts)
- [ranker.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/ranker.ts)
- [candidate-types.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/candidate-types.ts)

## Validation

- run `node --import tsx --test tests/github-trending.test.ts`
- run `node --import tsx --test tests/ranker.test.ts`

