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

## Domain Skill Fast Track

Some skills are **well-defined domain skills** — they contain a complete, step-by-step implementation guide with concrete code patterns and a `references/` directory. When a domain skill directly covers the current task, the full jds-think design cycle (clarification, spec writing, approval) is redundant — the skill itself is the spec.

**A domain skill is well-defined if:**
- Its `SKILL.md` contains step-by-step implementation instructions (not just tips or guidance)
- It has a `references/` directory with concrete code patterns
- It covers the complete workflow required by the current task end-to-end

**Fast-track rule:** When a well-defined domain skill covers the task, invoke it directly. Skip jds-think's full design cycle. At most, use jds-plan to produce a lightweight plan by following the domain skill's steps — no spec document or design exploration is needed. Then proceed straight to execution using that skill. The domain skill replaces spec, design, and clarification.

---

## The Skill-Check Rule

Before any action — including clarifying questions, file reads, or "quick explorations" — check whether a JDS skill applies. When in doubt about relevance, always invoke. This is non-negotiable.

**Skill priority:** Process skills first (jds-think, jds-debug), then implementation skills (jds-tdd, jds-execute).

**Announcement convention:** When invoking a skill, announce it before proceeding: "Using jds-think to clarify requirements before implementation."

## Instruction Priority

The user is always the final authority. Their explicit directives — whether in their own config files (such as `copilot-instructions.md`, `CLAUDE.md`, or `AGENTS.md`) or spoken directly — supersede everything else. JDS skills sit one level below: they replace default system prompt behavior wherever the two conflict, but they never override the user. The default system prompt fills in whatever neither the user nor JDS addresses.

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
| "I'm just cleaning up the code" | jds-refactor exists for safe restructuring. Use it. |
| "The deadline is tight" | Pressure causes shortcuts that compound into debt. Process is faster in the long run. |
| "I'll verify later" | jds-verify exists. Verify now or don't claim done. |

## Skill Recommendation

When no skill explicitly matches the user's request, suggest the closest match. Do not silently skip skill activation.

**How to recommend:**
1. Scan the user's request for keywords and intent
2. Compare against all skill descriptions
3. If a skill is ≥70% relevant, announce and invoke it
4. If 30–70% relevant, present it as a suggestion via `ask_user`:

```
ask_user(
  question="This request might benefit from the [skill-name] skill ([one-line description]). Should I activate it?",
  choices=["Yes, use [skill-name]", "No, proceed without it"]
)
```

5. If <30% relevant, proceed normally

**Keyword-to-skill mapping:**

| Keywords in Request | Recommended Skill |
|--------------------|-------------------|
| build, add, fix, create, implement, change, modify | jds-think |
| plan, break down, decompose, tasks | jds-plan |
| execute, implement plan, start building | jds-execute |
| parallel, concurrent, speed up, simultaneously | jds-parallel |
| test, TDD, red-green, coverage | jds-tdd |
| refactor, clean up, restructure, rename, extract, simplify | jds-refactor |
| bug, error, failing, broken, unexpected | jds-debug |
| done, complete, finished, verify, check | jds-verify |

## Context Isolation Principle

When dispatching any subagent, construct a focused prompt from only the relevant files and task context. Never pass session history to a subagent. Each subagent gets exactly what it needs for its specific job — nothing more.

## Skill Suite

| Skill | Type | Purpose |
|-------|------|---------|
| jds-think | Flexible | Requirements and design gate — the most important skill |
| jds-plan | Flexible | Translate confirmed spec into executable plan |
| jds-execute | Flexible | Work through plan tasks with two-stage review and model selection |
| jds-parallel | Flexible | Execute independent tasks concurrently for speed |
| jds-tdd | Rigid | Enforce RED-GREEN-REFACTOR cycle |
| jds-refactor | Rigid | Safe structural changes with behavioral equivalence verification |
| jds-debug | Rigid | Systematic root-cause debugging |
| jds-verify | Rigid | Evidence-based completion verification |
| jds-finish | Rigid | Final verification and artifact cleanup |

## Skill Types

Skills fall into two categories. **Rigid** skills — such as TDD and debugging — demand exact adherence; loosening their discipline defeats their purpose. **Flexible** skills define guiding principles that you should mold to fit the situation at hand. Each skill declares its own category, so consult it when unsure.

## User Instructions

A user directive defines the objective, not the process. Receiving "Add X" or "Fix Y" sets a goal — it does not authorize bypassing any skill or workflow step.
