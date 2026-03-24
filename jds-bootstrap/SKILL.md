---
name: jds-bootstrap
description: Use when starting any conversation - establishes the JDS skill suite, requiring skill checks before ANY action including clarifying questions. Invoke this at session start to activate the Jopa Development Superpowers workflow.
---

# JDS Bootstrap

This skill governs the Jopa Development Superpowers suite. It is injected at session start and establishes the rules for the entire session.

## The Skill-Check Rule

Before any action — including clarifying questions, file reads, or "quick explorations" — check whether a JDS skill applies. If there is even a 1% chance a skill is relevant, invoke it. This is non-negotiable.

**Skill priority:** Process skills first (jds-design, jds-debug), then implementation skills (jds-tdd, jds-execute).

**Announcement convention:** When invoking a skill, announce it before proceeding: "Using jds-design to clarify requirements before implementation."

## The Design Gate

If you are about to write code and have not completed the design phase for this task, stop. Invoke `jds-design`. This applies to every task regardless of perceived simplicity. A short design for a simple task is fine — but skipping design entirely is not.

## Rationalization Blocker

These thoughts mean STOP — you are rationalizing skipping a skill:

| Thought | Correct Response |
|---------|-----------------|
| "This is just a small change" | Small changes cause big bugs. Check for skills. |
| "I need more context first" | Skills tell you HOW to gather context. Check first. |
| "Let me explore the codebase quickly" | jds-design includes exploration. Use it. |
| "I already know how to do this" | Knowing how is not the same as following process. Check. |
| "The user just wants a quick fix" | Quick fixes without design cause regressions. Check. |
| "I'll write tests after" | jds-tdd exists for a reason. Check. |
| "This doesn't need a formal design" | jds-design scales down. It handles simple tasks too. |
| "Let me just start coding" | Code without design is the #1 failure mode. Stop. |

## Context Isolation Principle

When dispatching any subagent, construct a focused prompt from only the relevant files and task context. Never pass session history to a subagent. Each subagent gets exactly what it needs for its specific job — nothing more.

## Skill Suite

| Skill | Type | Purpose |
|-------|------|---------|
| jds-design | Flexible | Requirements and design gate — the most important skill |
| jds-plan | Flexible | Translate confirmed spec into executable plan |
| jds-execute | Flexible | Work through plan tasks with isolated subagents |
| jds-tdd | Rigid | Enforce RED-GREEN-REFACTOR cycle |
| jds-debug | Rigid | Systematic root-cause debugging |
| jds-verify | Rigid | Evidence-based completion verification |
| jds-finish | Rigid | Final verification and artifact cleanup |

**Rigid skills** are followed exactly. No adaptation, no shortcuts.
**Flexible skills** adapt to project context while preserving their structure.
