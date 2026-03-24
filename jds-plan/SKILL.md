---
name: jds-plan
description: Use after a spec has been confirmed via jds-design, to translate it into an executable implementation plan. Requires a spec file to exist under docs/jds/specs/. Invoke when transitioning from design to implementation, or when the user asks to plan how to build something that already has a spec.
---

# JDS Plan

**Type: Flexible** — adapt task granularity to project context, but the structure and rules are non-negotiable.

Translates a confirmed spec into an executable implementation plan. Every plan task must be atomic, complete, and independently verifiable.

## Prerequisites

A confirmed spec file must exist under `docs/jds/specs/`. If it does not, invoke jds-design first. Do not create a plan from verbal agreements or chat history alone — the spec file is the source of truth.

## Flow

### Step 1: Map File-Level Responsibilities

Before writing any tasks, list every file that will be created or modified and state its single responsibility. This is where decomposition decisions are locked in.

```markdown
## File Map
| File | Action | Responsibility |
|------|--------|---------------|
| src/auth/validator.ts | Create | Input validation for auth requests |
| src/auth/handler.ts | Modify | Add new validation step before processing |
| tests/auth/validator.test.ts | Create | Unit tests for validator |
```

If the spec covers independent subsystems, recommend splitting into separate plans — each producing working, testable software on its own.

### Step 2: Write Tasks

Each task must be 2-5 minutes of work. This granularity matters — it is what makes the plan executable by subagents and reviewable by humans.

**Every task must include:**
- Exact file paths
- Complete code (not stubs, not placeholders, not "similar to task N")
- The exact command to run for verification
- Expected output of the verification command

**TDD structure is mandatory.** Test tasks come before implementation tasks. The pattern is always: write failing test, confirm failure, write implementation, confirm pass.

**Do not include commit steps in tasks.** Committing is the responsibility of the caller or the developer, not the implementation loop.

### The No-Placeholders Rule

These are plan failures — if you catch yourself writing any of these, the task is incomplete:

- "TBD" or "TODO"
- "Add appropriate error handling"
- "Add validation"
- "Handle edge cases"
- "Similar to task N"
- Any step that describes what to do without showing the actual code

Every task must contain the actual content needed to execute it. A subagent reading the task should be able to implement it without inferring intent.

### Plan Document Format

```markdown
# [Feature Name] Implementation Plan

> For the implementing agent: follow each task exactly. Use jds-execute to work through this plan.
> Committing and pushing are not part of this plan — that is handled by the caller or the developer.

**Goal:** [one sentence]
**Spec:** [path to spec document]
**Modules affected:** [list]
**Execution order:** [task dependencies if any]

---

## File Map
[from Step 1]

---

## Tasks

### Task 1: [descriptive name]
- [ ] **File:** `path/to/file`
- [ ] **Action:** Create | Modify
- [ ] **Code:**
\```language
[complete code — not a stub]
\```
- [ ] **Verify:** `command to run`
- [ ] **Expected:** [exact expected output]

### Task 2: ...
```

Save to `docs/jds/plans/YYYY-MM-DD-<feature-name>.md`. Do NOT commit this file.

### Step 3: Plan Self-Review

After writing the plan, review it inline. No subagent dispatch needed. Check:

1. **Spec coverage:** Skim each requirement in the spec. Can you point to a task that implements it? List any gaps and add missing tasks.
2. **Placeholder scan:** Search for any of the failure patterns listed above. Fix every one.
3. **Type consistency:** Do method names, signatures, and property names match across tasks? A function called one thing in task 3 and something different in task 7 is a bug in the plan.
4. **Verification commands:** Does every task have one? Are they specific enough to actually confirm the task worked?

Fix all issues inline before proceeding.

### Step 4: Human Review

Present the final plan to the user for review. Keep this brief — the plan document itself is the deliverable.

"I've saved the implementation plan to `docs/jds/plans/YYYY-MM-DD-<feature-name>.md`. It has N tasks following TDD structure. Please take a look and let me know if anything needs adjustment."

### Step 5: Handoff

Announce the transition and invoke jds-execute:

"Using jds-execute to work through the implementation plan."

## Common Mistakes

| Mistake | Why It Matters |
|---------|---------------|
| Vague tasks ("add validation") | Subagents can't execute intent — they need code |
| Tasks longer than 5 minutes | Too much scope for reliable single-pass execution |
| Implementation before test tasks | Violates TDD — tests must come first |
| Missing verification commands | No way to confirm the task actually worked |
| Inconsistent naming across tasks | Creates bugs that surface late in implementation |
| Including commit steps | Committing is not owned by this skill |
