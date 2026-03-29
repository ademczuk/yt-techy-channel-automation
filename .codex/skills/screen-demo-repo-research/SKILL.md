---
name: screen-demo-repo-research
description: Use when selected repos need readme summaries, stronger factual framing, and research notes before metadata, script, or recording plan generation.
---

# Screen Demo Repo Research

## Overview

Use this project-local skill after source selection and before creator-facing writing.

## Rules

- Pull the real repo summary first.
- Prefer product description over hype, setup fluff, or community chatter.
- Keep the research notes factual so later stages can write in a stronger voice without hallucinating the product.

## Current Files

- [readme-enrichment.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/readme-enrichment.ts)
- [daily-copy.ts](C:/YT/Code%20Search/clawhub-weekly-master/src/lib/daily-copy.ts)

## Validation

- run `node --import tsx --test tests/readme-enrichment.test.ts`
- run `node --import tsx --test tests/daily-copy.test.ts`

