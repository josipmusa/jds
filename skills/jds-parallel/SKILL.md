---
name: jds-parallel
description: >
  Defines how parallel execution should be structured and handled — dependency analysis,
  wave formation, batch dispatch, conflict detection, and review. Invoked by jds-execute
  when the dependency graph has 3+ independent tasks. Do not invoke directly — jds-execute
  owns the decision of when to use parallel execution.
---

# JDS Parallel

**Type: Flexible** — adapt parallelism to the platform's capabilities and the task graph's shape, but the dependency analysis, isolation rules, and conflict detection are non-negotiable.

This skill describes **how** to execute plan tasks in parallel. The decision of **when** to use parallel execution belongs to jds-execute, which invokes this skill when the dependency graph has independent task groups.

## Dependency Analysis

Before dispatching any parallel work, build the task dependency graph:

### 1. Query Task Dependencies

```sql
SELECT t.id, t.title, t.status,
       GROUP_CONCAT(td.depends_on) as blocked_by
FROM todos t
LEFT JOIN todo_deps td ON td.todo_id = t.id
WHERE t.status != 'done'
GROUP BY t.id
ORDER BY t.created_at;
```

### 2. Identify Ready Tasks

**Wave 1:** jds-execute already identified the ready tasks before invoking this skill — use that list directly. Do not re-run the query for the first wave.

**Wave 2+:** After marking the previous wave `done`, re-query to find newly unblocked tasks:

```sql
SELECT t.id, t.title FROM todos t
WHERE t.status = 'pending'
AND NOT EXISTS (
    SELECT 1 FROM todo_deps td
    JOIN todos dep ON td.depends_on = dep.id
    WHERE td.todo_id = t.id AND dep.status != 'done'
);
```

### 3. File Overlap Check

Even if tasks have no explicit dependencies, check for implicit conflicts:

- Read each ready task's file list from the plan
- If two tasks modify the same file, they are implicitly dependent — do NOT run them in parallel
- If two tasks read the same file but neither modifies it, parallel is safe

## Wave Dispatch

### 1. Form Waves

Group ready tasks into a wave. Maximum wave size: **4 concurrent subagents**. More than 4 creates diminishing returns and increases resource contention.

### 2. Dispatch Subagents

Announce the wave before dispatching:

```
Dispatching Wave N: task-id-a, task-id-b, task-id-c
```

For each task in the wave, use jds-execute's subagent prompt template with these additions:

- Add an **Isolation Notice** to the prompt:
  > You are one of [N] parallel agents. Other agents are working on different tasks simultaneously. Do NOT modify any file outside your task's scope. If you discover a need to change a file not listed in your task, STOP and report it — do not make the change.

- Include the **Status Protocol** (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) as defined in jds-execute.

Dispatch all tasks in the wave using background mode.

### 3. Collect Results

Wait for all subagents in the wave to complete. For each:
- Record the reported status
- Note all files created or modified
- Check for unexpected file modifications outside the task's declared scope

**Handle non-DONE statuses:**
- **DONE_WITH_CONCERNS:** Review concerns, decide with human before proceeding.
- **NEEDS_CONTEXT:** Pull from the wave. Provide context and re-dispatch sequentially.
- **BLOCKED:** Pull from the wave. Surface to human. Consider jds-debug.

### 4. Conflict Detection

After a wave completes, check for conflicts:

- **Same file modified by two agents** → Try to merge both changesets. If changes are non-overlapping (different methods, different sections), keep both. If changes overlap (same lines/blocks), keep the agent whose changes have better test coverage (or smaller diff if equal) and re-dispatch the other task sequentially with the merged state as context.
- **File modified outside declared scope** → Review the change manually. If justified, accept and update the task's file list. If not, revert and re-dispatch.

### 5. Review

Apply jds-execute's two-stage review (spec compliance → code quality) to the wave as a batch. Both stages must pass. The review prompts are the same as jds-execute's, with one addition to Stage 1:

> **Conflict Check:** Verify no file was modified by multiple tasks. Verify each task stayed within its declared file scope.

### 6. Handle Failures

- If a task fails: re-queue for the next wave (sequential fallback after 2 parallel failures)
- If a conflict is detected: resolve per the conflict detection rules above
- Maximum 3 iterations per task (same as jds-execute)

## Wave Pipelining

When the dependency graph allows it, **overlap waves** to reduce total execution time:

1. After dispatching Wave N, immediately check if Wave N+1's tasks are independent of Wave N (no dependency edges, no file overlap)
2. If independent: dispatch Wave N+1 without waiting for Wave N's review to complete
3. If any Wave N+1 task depends on a Wave N task: wait for Wave N to finish

**Pipelining constraints:**
- Maximum 2 overlapping waves at a time (Wave N executing + Wave N+1 executing)
- If Wave N's review fails, pause Wave N+1 until Wave N's fixes are applied and reviewed
- Only pipeline waves where ALL tasks in the later wave are independent of the earlier wave — partial overlap is not safe

This is most effective for large plans with many independent leaf tasks across separate modules.

## Next Wave

After a wave completes and passes review:

1. Mark completed tasks as `done` in SQL
2. Re-query for newly-ready tasks (tasks whose dependencies just completed)
3. Form the next wave
4. Repeat until all tasks are done

## Progress Reporting

Between waves, report progress:

```sql
SELECT status, count(*) as cnt FROM todos GROUP BY status;
```

Announce: "Wave N complete: [X] tasks done, [Y] remaining. Next wave: [list task IDs]."

## Falling Back to Sequential

If parallel execution encounters repeated issues (conflicts, scope violations, shared state), fall back to sequential for the remaining tasks:

"Switching to sequential execution — parallel dispatch encountered [reason]. Remaining [N] tasks will execute one at a time."

## Common Mistakes

| Mistake | Why It Matters |
|---------|---------------|
| Running dependent tasks in parallel | Downstream task builds on incomplete foundation — guaranteed failure |
| Ignoring file overlap | Two agents editing the same file produces merge conflicts or data loss |
| Wave size > 4 | Resource contention, harder to debug failures, diminishing speed gains |
| No conflict detection after wave | Silent corruption when two agents modify the same file |
| Skipping the ready-tasks query | Runs tasks before their dependencies complete |
| Pipelining dependent waves | Later wave reads stale state from unfinished earlier wave |
| Not falling back to sequential | Some plans aren't parallelizable — forcing it wastes time |
