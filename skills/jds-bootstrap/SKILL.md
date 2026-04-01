---
name: jds-bootstrap
description: Use when starting any conversation - establishes the JDS skill suite, requiring skill checks before ANY action including clarifying questions. Invoke this at session start to activate the JDS workflow.
---

<SUBAGENT-STOP>
Subagents running isolated tasks should bypass this skill entirely.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
Any doubt about whether a skill is relevant — even the slightest — means you MUST invoke it immediately.
APPLICABLE SKILLS ARE MANDATORY. THERE IS NO OPT-OUT MECHANISM.
No justification, no shortcut, no internal reasoning can exempt you from this requirement.
</EXTREMELY-IMPORTANT>

## The Skill-Check Rule

Before any action — including clarifying questions, file reads, or "quick explorations" — check whether a JDS skill applies. When in doubt about relevance, always invoke. This is non-negotiable.

**Skill priority:** Process skills first (jds-think, jds-debug), then implementation skills (jds-tdd, jds-execute).

**Announcement convention:** When invoking a skill, announce it before proceeding: "Using jds-think to clarify requirements before implementation."

## Instruction Priority

The user is always the final authority. Their explicit directives — whether in CLAUDE.md, copilot-instructions.md, AGENTS.md, or spoken directly — supersede everything else. JDS skills sit one level below: they replace default system prompt behavior wherever the two conflict, but they never override the user. The default system prompt fills in whatever neither the user nor JDS addresses.

**Example:** if a user's configuration file forbids TDD but jds-tdd demands it, the user's configuration wins. Skills govern process; the user governs policy.

## The Design Gate

If you are about to write code and have not completed the design phase for this task, stop. Invoke `jds-think`. This applies to every task regardless of perceived simplicity. A short design for a simple task is fine — but skipping design entirely is not.

## Rationalization Blocker

If you catch yourself thinking any of the following, stop — you are looking for an excuse to skip a skill:

| Thought | Correct Response |
|---------|-----------------|
| "This is trivial, no skill needed" | Trivial changes cause subtle bugs. Check for skills. |
| "I should understand the code first" | Skills define how to explore. Consult them before exploring on your own. |
| "A quick look at the repo won't hurt" | jds-think already includes structured exploration. Use it. |
| "I already know how to do this" | Competence doesn't replace process. Check. |
| "The user wants something fast" | Rushing without design creates regressions. Check. |
| "I'll add tests afterward" | jds-tdd exists precisely for this impulse. Check. |
| "This doesn't warrant a full design" | jds-think adapts to scope. It handles lightweight tasks. |
| "Let me just start coding" | Code without design is the primary failure mode. Stop. |

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

Skills fall into two categories. **Rigid** skills — such as TDD and debugging — demand exact adherence; loosening their discipline defeats their purpose. **Flexible** skills define guiding principles that you should mold to fit the situation at hand. Each skill declares its own category, so consult it when unsure.

## User Instructions

A user directive defines the objective, not the process. Receiving "Add X" or "Fix Y" sets a goal — it does not authorize bypassing any skill or workflow step.
