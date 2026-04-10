---
name: jds-execute
description: Use when a confirmed implementation plan exists under docs/jds/plans/ and you need to execute it task by task using subagents with context isolation. Invoke after jds-plan completes, or when the user asks to execute or implement an existing plan.
---

# JDS Execute

**Type: Flexible** — adapt subagent dispatch to the platform's capabilities, but the task loop structure and context isolation are non-negotiable.

Works through an implementation plan task by task. Each task is executed by an isolated subagent that receives only what it needs — never session history.

## Prerequisites

A confirmed plan file must exist under `docs/jds/plans/`. If it does not, invoke jds-plan first.

## Visualization

Before the task loop, start the viz server:

```bash
# Build once if dist/ doesn't exist yet
[ -f viz/dist/server.js ] || (cd viz && npm install && npm run build)

# Start (idempotent — returns immediately if already running)
viz/start.sh
```

On success, `viz/start.sh` prints the URL line — relay it to the user:
```
Task visualization running at http://localhost:3847
```

If port 3847 is taken the server picks the next free one. The server is stopped automatically by the SessionEnd hook when the session ends.

## Model Selection

Use the right model tier for each role. Match model capability to task complexity — don't use premium models for simple work.

| Role | Simple Tasks | Complex Tasks |
|------|-------------|---------------|
| **Implementer** | Sonnet (latest) | Opus (latest) |
| **Spec Compliance Reviewer** | Sonnet (latest) | Sonnet (latest) |

**Resolving "latest":** Always use the highest available version of each model tier. Check the platform's model list — pick the Sonnet with the highest version number for Sonnet tasks, the Opus with the highest version number for Opus tasks. Never use an older version when a newer one is available.

**Classifying task complexity:**
- **Simple:** Single file, clear requirements, straightforward logic (add a field, write a CRUD endpoint, rename a class)
- **Complex:** Multiple files, architectural decisions, nuanced business logic, security-sensitive code, performance-critical paths

When in doubt, use Sonnet — it handles the vast majority of tasks well. Reserve Opus for tasks where reasoning depth genuinely matters.

## Context Isolation

This principle is the foundation of reliable subagent execution:

- Construct each subagent's prompt from only the current task's text, the spec goal, the relevant file structure, and direct dependencies from prior completed tasks.
- Never pass the full plan, session history, or unrelated context.
- Each subagent starts fresh with a focused, self-contained prompt.

The reason this matters: subagents that inherit session context make assumptions from earlier conversation that may no longer be accurate. Isolated context forces each task to be self-contained and verifiable.

## State-Driven Execution

Before starting the task loop, query the tracking state to determine where to begin:

```sql
SELECT id, title, status FROM todos WHERE status != 'done' ORDER BY created_at;
```

Skip any tasks already marked `done` — do not re-execute completed work.

Print the dependency order before starting the loop:

```sql
SELECT t.id, t.title, GROUP_CONCAT(td.depends_on, ', ') as deps
FROM todos t
LEFT JOIN todo_deps td ON td.todo_id = t.id
GROUP BY t.id
ORDER BY t.created_at;
```

Render it sorted topologically — tasks with no dependencies first, then tasks whose dependencies are listed above them. Reference full task IDs, not positional numbers:

```
Execution order:
  task-1-create-validator        (no dependencies)
  task-5-update-readme           (no dependencies)
  task-2-write-tests             (after: task-1-create-validator)
  task-3-add-handler             (after: task-1-create-validator)
  task-4-integration-test        (after: task-2-write-tests, task-3-add-handler)
```

Between tasks, report progress:

```sql
SELECT status, count(*) as cnt FROM todos GROUP BY status;
```

## Per-Task Loop

For each task in the plan:

### 1. Extract Task Context

Read the current task's text from the plan file. Identify:
- The files involved
- Any outputs from prior tasks this one depends on
- The verification command and expected output
- The complexity classification (simple or complex)

### 2. Dispatch Implementer

Send a subagent with this structure. Use the model tier appropriate for the task's complexity.

```
## Task
[Exact task text from the plan]

## Project Context
Goal: [one-sentence goal from the spec]
Relevant file structure: [only the files this task touches or depends on]

## Dependencies from Prior Tasks
[List any files created or modified by earlier tasks that this task builds on.
Include the current content of those files if the task depends on them.]

## Rules
- Follow TDD: write the failing test first, confirm it fails, then implement.
- Self-review your work before reporting: check that the code matches the task
  requirements exactly — nothing more, nothing less.
- Run the verification command and include the output in your response.
```

### 3. Dispatch Compliance Reviewer

After the implementer reports completion, send a separate subagent to verify:

```
## Review Task
Verify that the implementation matches the task requirements exactly.

## Task Requirements
[Exact task text from the plan]

## Verification
- Read the actual files that were created or modified.
- Compare line-by-line against the task requirements.
- Check for missing pieces AND extra features not in the spec.
- Run the verification command independently.

## Response Format
- COMPLIANT: Implementation matches requirements exactly.
- ISSUES: [List each issue with file:line reference]
```

Do NOT trust the implementer's self-report. The reviewer must verify independently.

### 4. Handle Issues

If the compliance reviewer finds issues:
- Send the issues back to a new implementer subagent with the fix instructions.
- Re-review after fixes.
- Maximum 3 iterations per task. If still failing after 3, surface to the human.

### 5. Test Naming Convention

For tasks that write tests, include this in the subagent prompt:

```
Test method names must follow this pattern:
  When_<SomeAction>_Expect_<Result>

Examples:
  When_UserSubmitsEmptyForm_Expect_ValidationFails
  When_ValidTokenProvided_Expect_AuthSucceeds
  When_DuplicateEmail_Expect_RegistrationRejected
```

### 6. Mark Complete

After compliance review passes:
- Update the plan file: check the task's checkbox.
- Update the SQL tracking state:
  ```sql
  UPDATE todos SET status = 'done', updated_at = datetime('now') WHERE id = 'task-N-...';
  ```
- Report progress:
  ```sql
  SELECT status, count(*) as cnt FROM todos GROUP BY status;
  ```
- Move to the next task.

If a task is blocked (failing after 3 iterations):
```sql
UPDATE todos SET status = 'blocked', updated_at = datetime('now') WHERE id = 'task-N-...';
```

### 7. Completion

When all tasks are complete, announce and invoke jds-finish:

"All plan tasks are complete. Using jds-finish for final verification and cleanup."

## Blocking Rule

If any task's tests fail after implementation and the implementer cannot fix them within 3 iterations, do not proceed to the next task. Surface the failure to the human explicitly:

"Task N is blocked: [description of the failure]. The tests fail with [specific error]. I've attempted 3 fix iterations without success. How would you like to proceed?"

At this point, consider invoking jds-debug for systematic root-cause analysis.

## Parallel Execution

jds-execute owns the decision of when to use parallel execution. When the dependency graph has independent task groups, invoke jds-parallel to handle wave-based dispatch.

Check the dependency graph for ready tasks:

```sql
SELECT t.id, t.title FROM todos t
WHERE t.status = 'pending'
AND NOT EXISTS (
    SELECT 1 FROM todo_deps td
    JOIN todos dep ON td.depends_on = dep.id
    WHERE td.todo_id = t.id AND dep.status != 'done'
);
```

If 3+ tasks are ready simultaneously, pass the ready task list to jds-parallel — do not let it re-derive them from the same query:

"Multiple independent tasks are ready: [task-id-a, task-id-b, task-id-c]. Using jds-parallel for concurrent execution."

## No Committing

The implementation loop writes and verifies code. It does not commit. Committing is the responsibility of the calling skill or the developer after the full workflow completes.

## Common Mistakes

| Mistake | Why It Matters |
|---------|---------------|
| Passing full plan to subagent | Context pollution — subagent makes assumptions from other tasks |
| Passing session history | Stale context causes incorrect implementations |
| Trusting implementer's self-report | Implementers miss their own mistakes — independent review catches them |
| Continuing past a failed task | Downstream tasks build on broken foundations |
| Using Opus for every task | Can be slow — Sonnet handles most tasks well |
| More than 3 fix iterations | Diminishing returns — the human needs to weigh in |
| Committing inside the loop | Not owned by this skill |
