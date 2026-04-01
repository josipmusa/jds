---
name: jds-bootstrap
description: Use when starting any conversation - establishes the JDS skill suite, requiring skill checks before ANY action including clarifying questions. Invoke this at session start to activate the JDS workflow.
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.
IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.
This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## The Skill-Check Rule

Before any action — including clarifying questions, file reads, or "quick explorations" — check whether a JDS skill applies. If there is even a 1% chance a skill is relevant, invoke it. This is non-negotiable.

**Skill priority:** Process skills first (jds-think, jds-debug), then implementation skills (jds-tdd, jds-execute).

**Announcement convention:** When invoking a skill, announce it before proceeding: "Using jds-think to clarify requirements before implementation."

## Instruction Priority

JDS skills override default system prompt behavior, but **user instructions always take precedence**:

1. **User's explicit instructions** (CLAUDE.md, copilot-instructions.md, AGENTS.md, direct requests) — highest priority
2. **JDS skills** — override default system behavior where they conflict
3. **Default system prompt** — lowest priority

If CLAUDE.md, copilot-instructions.md, or AGENTS.md says "don't use TDD" and a skill says "always use TDD," follow the user's instructions. The user is in control.

## The Design Gate

If you are about to write code and have not completed the design phase for this task, stop. Invoke `jds-think`. This applies to every task regardless of perceived simplicity. A short design for a simple task is fine — but skipping design entirely is not.

## Rationalization Blocker

These thoughts mean STOP — you are rationalizing skipping a skill:

| Thought | Correct Response |
|---------|-----------------|
| "This is just a small change" | Small changes cause big bugs. Check for skills. |
| "I need more context first" | Skills tell you HOW to gather context. Check first. |
| "Let me explore the codebase quickly" | jds-think includes exploration. Use it. |
| "I already know how to do this" | Knowing how is not the same as following process. Check. |
| "The user just wants a quick fix" | Quick fixes without design cause regressions. Check. |
| "I'll write tests after" | jds-tdd exists for a reason. Check. |
| "This doesn't need a formal design" | jds-think scales down. It handles simple tasks too. |
| "Let me just start coding" | Code without design is the #1 failure mode. Stop. |

## Context Isolation Principle

When dispatching any subagent, construct a focused prompt from only the relevant files and task context. Never pass session history to a subagent. Each subagent gets exactly what it needs for its specific job — nothing more.

## Skill Suite

| Skill | Type | Purpose |
|-------|------|---------|
| jds-think | Flexible | Requirements and design gate — the most important skill |
| jds-plan | Flexible | Translate confirmed spec into executable plan |
| jds-execute | Flexible | Work through plan tasks with isolated subagents |
| jds-tdd | Rigid | Enforce RED-GREEN-REFACTOR cycle |
| jds-debug | Rigid | Systematic root-cause debugging |
| jds-verify | Rigid | Evidence-based completion verification |
| jds-finish | Rigid | Final verification and artifact cleanup |

## Interruption Recovery

On session start, check for incomplete work from a previous session:

1. Query the SQL tracking state:
   ```sql
   SELECT id, title, status FROM todos WHERE status IN ('pending', 'in_progress') ORDER BY created_at;
   ```
2. If results exist, use `ask_user` to offer resumption:
   ```
   ask_user(
     question="Found [N] incomplete tasks from a previous session. Would you like to resume or start fresh?",
     choices=["Resume from last checkpoint", "Start fresh (clear tracking state)"]
   )
   ```
3. If **resume**: announce "Resuming from last checkpoint" and invoke jds-execute with the existing plan.
4. If **start fresh**: clear the tracking state and proceed normally:
   ```sql
   DELETE FROM todo_deps;
   DELETE FROM todos;
   ```

This enables the same interruption recovery that Claude Code's TodoWrite provides — persistent task state that survives session boundaries.

## Skill Types

**Rigid** (TDD, debugging): Follow exactly. Don't adapt away discipline.

**Flexible** (patterns): Adapt principles to context.

The skill itself tells you which.

## User Instructions

Instructions say WHAT, not HOW. "Add X" or "Fix Y" doesn't mean skip workflows.
