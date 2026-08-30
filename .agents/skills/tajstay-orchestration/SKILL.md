---
name: tajstay-orchestration
description: Routes TajStay tasks to Design, UX, Engineering, Security, QA, or Human-like QA agents. Use when planning multi-step work, audits, or deciding which skills to invoke. Prevents loading the entire skill stack at once.
disable-model-invocation: true
---

# TajStay orchestration

Read `.cursor/rules/tajstay-orchestration.mdc` and `.agents/README.md`.

## Workflow

1. Classify the user task (UI / UX / bug / security / E2E / autonomous batch).
2. List which agents are required (minimum set).
3. Name concrete skills to read next (one design skill + one review skill max unless audit).
4. State protected domains if task touches auth, booking, payment, or DB.
5. End with quality gate checks from `tajstay-quality-gate.mdc`.

## Default first step for any feature work

Always read **explore-before-build** (`.agents/.cursor/explore-before-build.md`) before writing code.

## Product constants

- Product: **TajStay**
- Assistant: **TST Assistant**
- Bottom nav: Home · Search · Tours · History · Profile
- History: `/history` only — Profile links, never duplicates
