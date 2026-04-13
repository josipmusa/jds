---
name: jds-plan
description: Use after a spec has been confirmed via jds-think, to translate it into an executable implementation plan. Requires a spec file to exist under docs/jds/specs/. Invoke when transitioning from design to implementation, or when the user asks to plan how to build something that already has a spec. Also invoke for Moderate tasks that skip the spec phase — jds-plan can work directly from jds-think's exploration context.
---

# JDS Plan

**Type: Flexible** — adapt task granularity to project context, but the structure and rules are non-negotiable.

Translates a confirmed spec into an executable implementation plan. Every plan task must be atomic, complete, and independently verifiable.

## Prerequisites

**Standard path (Complex tasks):** A confirmed spec file must exist under `docs/jds/specs/`. If it does not, invoke jds-think first. Do not create a plan from verbal agreements or chat history alone — the spec file is the source of truth.

**Specless path (Moderate tasks):** When jds-think classified the task as Moderate and skipped the spec phase, jds-plan is invoked directly. In this case:
- No spec file is required
- The plan is built from jds-think's exploration context and any clarifying answers from the user
- The plan document's `Spec:` field should read `N/A — Moderate task, spec skipped per jds-think classification`
- All other plan rules (file map, task granularity, TDD structure, no-placeholders, verification commands) still apply in full

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

### Step 3: Track Tasks in SQL

After writing the plan document, extract all tasks into the SQL tracking system. This enables progress visibility throughout execution.

For each task in the plan:

```sql
INSERT INTO todos (id, title, description, status)
VALUES ('task-N-kebab-name', 'Task N: Descriptive name', 'Full task description including file paths and verification commands', 'pending');
```

**ID convention:** Use `task-N-kebab-description` format (e.g., `task-1-create-auth-validator`, `task-2-add-login-tests`).

For tasks with sub-steps (individual file operations within a task), insert child todos:

```sql
INSERT INTO todos (id, title, description, status)
VALUES ('task-N-step-M', 'Sub-step description', 'Details', 'pending');

INSERT INTO todo_deps (todo_id, depends_on)
VALUES ('task-N-step-M', 'task-N-kebab-name');
```

For sequential task dependencies:

```sql
INSERT INTO todo_deps (todo_id, depends_on)
VALUES ('task-2-kebab-name', 'task-1-kebab-name');
```

Verify the tracking state after insertion:

```sql
SELECT id, title, status FROM todos ORDER BY created_at;
```

### The No-Placeholders Rule

A task is only complete when a subagent can execute it without guessing. These patterns indicate an incomplete task — find and eliminate every instance:

- Deferred decisions: "TBD", "TODO", or "decide later"
- Handwaved logic: "add error handling", "validate inputs", "cover the edge cases"
- Forward references: "like task N" or "same pattern as above" — each task must stand alone
- Intent without implementation: describing *what* to do instead of showing *how*

If a task can't be executed from its text alone, it isn't done yet.

### Plan Document Format

```markdown
# [Feature Name] Implementation Plan

> For the implementing agent: follow each task exactly. Use jds-execute to work through this plan.
> Committing and pushing are not part of this plan — that is handled by the caller or the developer.

**Goal:** [one sentence]
**Spec:** [path to spec document, or "N/A — Moderate task, spec skipped per jds-think classification"]
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

### Step 4: Plan Self-Review

Review the plan inline before handing off. No subagent needed. Four checks:

1. **Spec coverage:** If a spec exists, skim each requirement in the spec. Can you point to a task that implements it? List any gaps and add missing tasks. If no spec (Moderate path), verify that the plan covers the full scope discussed during jds-think exploration.
2. **Completeness scan:** Find every instance of the placeholder patterns above. A plan with even one deferred decision or handwaved step is not ready to execute.
3. **Symbol consistency:** Pick any identifier defined in an early task — method name, type, property. Does every later task that references it use the exact same name? Drift here causes integration failures.
4. **Verifiability:** Every task needs a command that concretely confirms it worked. "Run the test" is not sufficient — specify the exact command and what its output should say.

Fix inline. Move on.

### Step 5: Human Review

Use `ask_user` to present the plan and ask for confirmation before proceeding:

```
ask_user(
  question="I've saved the implementation plan to docs/jds/plans/YYYY-MM-DD-<feature-name>.md. It has N tasks following TDD structure. Does everything look correct, or do you want to adjust anything before I start executing?",
  choices=["Looks good — start executing", "I have adjustments"]
)
```

### Step 6: Handoff

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
