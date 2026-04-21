---
name: jds-execute
description: Use when a confirmed implementation plan exists under docs/jds/plans/ and you need to execute it task by task using subagents with context isolation. Invoke after jds-plan completes, or when the user asks to execute or implement an existing plan.
---

# JDS Execute

**Type: Flexible** — adapt subagent dispatch to the platform's capabilities, but the scheduler loop, context isolation, and conflict rules are non-negotiable.

Works through an implementation plan using a worker-pool scheduler. Each task is executed by an isolated subagent that receives only what it needs — never session history. The scheduler keeps up to `CONCURRENCY` independent subagents running and tops up freed slots the moment any subagent completes.

There is no separate "sequential vs. parallel" decision. Sequential is just `CONCURRENCY = 1`. The same loop runs in every case.

## Prerequisites

A confirmed plan file must exist under `docs/jds/plans/`. If it does not, invoke jds-plan first.

## Visualization

Before the task loop, start the viz server. All paths are inside the JDS plugin,
not the user's project — derive the plugin root from this skill's base directory
(shown in the header above when the skill loaded):

```
plugin root  =  <skill-base-dir>/../..
               e.g. /home/user/.copilot/plugins/jds/skills/jds-execute
                 →  /home/user/.copilot/plugins/jds
```

```bash
PLUGIN_ROOT="<skill-base-dir>/../.."   # substitute the actual path

# Resolve the current session's DB path from the session folder.
# The session folder is provided in the session context header
# (e.g. /home/user/.copilot/session-state/<session-id>).
SESSION_DB="<session-folder>/session.db"

# Start (idempotent — returns immediately if already running).
# start.sh is self-bootstrapping: it runs npm install + npm run build
# automatically when dist/ is missing or stale, so no separate build step
# is needed.
"$PLUGIN_ROOT/tools/viz/start.sh" --db "$SESSION_DB"
```

On success, `start.sh` prints the URL line — relay it to the user:
```
Task visualization running at http://localhost:3847
```

If port 3847 is taken the server picks the next free one. The server self-terminates after `IDLE_TIMEOUT_MS` (5 minutes) with no active WebSocket clients — see `tools/viz/server.ts`. To stop it sooner, call `tools/viz/stop.sh --db "$SESSION_DB"` (or, in scripts, kill the PID in `/tmp/jds-viz-<session-id>.pid`).

## Model Selection

Use the right model tier for the implementer. Match model capability to task complexity — don't use premium models for simple work.

| Role | Simple Tasks | Complex Tasks |
|------|-------------|---------------|
| **Implementer** | Sonnet (latest) | Opus (latest) |
| **Reviewer (rubber-duck)** | Auto — do not override | Auto — do not override |

The reviewer is the platform's `rubber-duck` agent (see *Reviewer* below). Per its tool contract, do **not** set the `model` argument on the rubber-duck dispatch — the platform picks the right model automatically.

**Resolving "latest" for the implementer:** Always use the highest available version of each model tier. Check the platform's model list — pick the Sonnet with the highest version number for Sonnet tasks, the Opus with the highest version number for Opus tasks. Never use an older version when a newer one is available.

**Classifying task complexity:**
- **Simple:** Single file, clear requirements, straightforward logic (add a field, write a CRUD endpoint, rename a class)
- **Complex:** Multiple files, architectural decisions, nuanced business logic, security-sensitive code, performance-critical paths

When in doubt, use Sonnet — it handles the vast majority of tasks well. Reserve Opus for tasks where reasoning depth genuinely matters.

## Context Isolation

This principle is the foundation of reliable subagent execution:

- Construct each subagent's prompt from only the current task's text, the spec goal, the relevant file structure, and direct outputs from prior completed tasks this one depends on.
- Never pass the full plan, session history, or unrelated context.
- Each subagent starts fresh with a focused, self-contained prompt.

The reason this matters: subagents that inherit session context make assumptions from earlier conversation that may no longer be accurate. Isolated context forces each task to be self-contained and verifiable.

## Setup (Before the Loop)

1. **Set concurrency.** Default `CONCURRENCY = 4`. This matches the platform's typical subagent cap. Use `CONCURRENCY = 1` only if the user explicitly requests sequential execution or the plan is structurally serial (every task depends on the previous one).

2. **Resume state.** Skip any tasks already marked `done` — do not re-execute completed work.
   ```sql
   SELECT id, title, status FROM todos WHERE status != 'done' ORDER BY created_at;
   ```

3. **Print the dependency order.** Render it sorted topologically — tasks with no dependencies first, then tasks whose dependencies are listed above them. Reference full task IDs, not positional numbers:
   ```sql
   SELECT t.id, t.title, GROUP_CONCAT(td.depends_on, ', ') as deps
   FROM todos t
   LEFT JOIN todo_deps td ON td.todo_id = t.id
   GROUP BY t.id
   ORDER BY t.created_at;
   ```

   ```
   Execution order:
     task-1-create-validator        (no dependencies)
     task-5-update-readme           (no dependencies)
     task-2-write-tests             (after: task-1-create-validator)
     task-3-add-handler             (after: task-1-create-validator)
     task-4-integration-test        (after: task-2-write-tests, task-3-add-handler)
   ```

4. **Initialize an empty `running` set.** Track it as `{ agent_id → { task_id, files[] } }` for the duration of the loop. The plan tells you each task's declared file scope — record it when dispatching.

## The Scheduler Loop

The loop is the only execution model. Run it on every turn until all tasks are `done` or `blocked`.

### Phase 1 — Top-Up (fill every free slot before yielding)

Repeat until either `len(running) == CONCURRENCY` or no eligible task remains:

1. **Query ready candidates** — pending tasks whose dependencies are all `done`:
   ```sql
   SELECT t.id, t.title FROM todos t
   WHERE t.status = 'pending'
   AND NOT EXISTS (
       SELECT 1 FROM todo_deps td
       JOIN todos dep ON td.depends_on = dep.id
       WHERE td.todo_id = t.id AND dep.status != 'done'
   )
   ORDER BY t.created_at;
   ```

2. **Filter for independence from running tasks** — a candidate is dispatchable only if its declared file scope does NOT overlap any file scope in `running`. Two tasks that read the same file but neither modifies it are still safe; two tasks that modify the same file are NOT.

3. **Dispatch the first eligible candidate:**
   - `UPDATE todos SET status='in_progress' WHERE id='<task-id>';`
   - Dispatch implementer subagent in **background mode** using the prompt template in *Subagent Prompts* below. Use the model tier appropriate for the task's complexity.
   - Add the returned `agent_id` to `running` with the task's id and file scope.
   - Announce: `Dispatched task-id (agent <agent_id>) — slots: N/CONCURRENCY`.

4. Loop back to step 1. The query may surface new candidates that became eligible because file overlap was resolved by another task already running.

### Phase 2 — Decision

After top-up:

- **`running` empty AND no pending tasks** → all done. Announce completion and invoke jds-finish.
- **`running` empty AND pending tasks remain** → blocked (dependency cycle, all remaining tasks conflict on files, or all blocked by 3-iteration failures). Surface to human; consider jds-debug.
- **`running` non-empty** → **yield** until the next subagent completes.

  **How yielding works on this platform.** This CLI auto-resumes the agent's turn when any background subagent completes — the runtime delivers a `<system_notification>` that wakes the agent. The user does **NOT** need to re-prompt; the conversation is not over. Yielding is the only viable wait primitive (there is no `wait_for_any`, and `read_agent(wait=true)` blocks on a single agent with a 180s cap — too short for real implementation work).

  **What to do:**
  1. Announce clearly before yielding so the user knows the work is in flight, not stalled. Example:
     > Waiting on 4 subagents (task-a, task-b, task-c, task-d). Will resume automatically the moment any one finishes. No action needed from you.
  2. End the response with **no further tool calls**.
  3. Do **NOT** poll, do not loop, do not call `read_agent` repeatedly. The platform will wake the agent.

  When the notification arrives, the agent resumes at **Phase 3 — On Resume** below.

### Phase 3 — On Resume (after a completion notification)

1. Call `list_agents(include_completed=true)` and find which agents in `running` have status `completed`, `failed`, or `cancelled`. There may be more than one if multiple completed while the agent was paused.

2. For each finished agent:
   - `read_agent(agent_id, wait=true)` — retrieve the implementer's full output. **Capture the entire `result` text verbatim**, not a summary or a paraphrase. You will pass this text into the reviewer prompt below; the reviewer cannot critique what you do not give it.
   - **Conflict check** — verify the implementer did not modify any file outside the task's declared scope. If it did:
     - If the change is justified (e.g. a missed dependency surfaced), accept and update the task's file list.
     - If not justified, revert the unauthorized change and treat the task as having ISSUES.
   - **Build the reviewer prompt** — take the *Reviewer Prompt* template from the *Subagent Prompts* section and substitute every placeholder verbatim:
     - `[Exact task text from the plan]` ← from the plan file
     - `[List of files the implementer was permitted to create or modify]` ← the task's declared file scope
     - `[Implementer's Reported Output]` ← the **full, unsummarized** `result` text captured above
     - `[The exact command from the task, e.g. \`npm test -- auth.test.ts\`]` ← the verification command
   - **Review** — dispatch the platform's **`rubber-duck` agent** **synchronously** with the prompt you just built (it does not consume an implementer slot). Do not override its `mode` or `model` arguments — let it pick the model.
   - **Apply review verdict (parsed from the structured output block at the end of the rubber-duck response):**
     - **VERDICT: COMPLIANT** → `UPDATE todos SET status='done', updated_at=datetime('now') WHERE id='<task-id>';` Remove from `running`.
     - **VERDICT: ISSUES** → re-dispatch implementer (background) into the same slot with the listed issues as fix instructions. Track per-task iteration count. After **3 failed iterations**, mark `blocked` and free the slot:
       ```sql
       UPDATE todos SET status='blocked', updated_at=datetime('now') WHERE id='<task-id>';
       ```
       Surface to human.
   - Update the plan file: check the task's checkbox if it just became `done`.

3. **Report progress:**
   ```sql
   SELECT status, count(*) as cnt FROM todos GROUP BY status;
   ```

4. Go back to **Phase 1 (top-up)**. Newly freed slots get filled immediately.

### Why this matters

- A task dispatches the moment it is independent of every running task — no waiting for an arbitrary "wave" boundary.
- A new task can join an in-flight set the moment a slot frees, even if other slots are still busy.
- The same loop handles 1 task and 100 tasks. There is no parallel/sequential branch to rationalize past.

## Subagent Prompts

### Implementer Prompt

```
## Task
[Exact task text from the plan]

## Project Context
Goal: [one-sentence goal from the spec]
Relevant file structure: [only the files this task touches or depends on]

## Dependencies from Prior Tasks
[List any files created or modified by earlier tasks that this task builds on.
Include the current content of those files if the task depends on them.]

## Isolation Notice
You may be one of multiple parallel agents. Other agents may be working on different
tasks at the same time. Do NOT modify any file outside your task's declared scope.
If you discover a need to change a file not listed in your task, STOP and report it
in your response — do not make the change.

## Rules
- Follow TDD: write the failing test first, confirm it fails, then implement.
- Self-review your work before reporting: check that the code matches the task
  requirements exactly — nothing more, nothing less.
- Run the verification command and include the output in your response.
```

### Reviewer Prompt (rubber-duck)

The reviewer is the platform's `rubber-duck` agent. Dispatch it via the `task` tool with `agent_type: "rubber-duck"`. Do not override `mode` or `model` — the defaults are correct (synchronous, auto-selected model). Rubber-duck has full investigation tools and will read files independently.

The prompt has two halves: the critique brief, and a **mandatory structured verdict contract** that lets the scheduler parse a clean COMPLIANT / ISSUES decision out of rubber-duck's prose.

```
## Review Brief
You are reviewing the implementation of a single task from a larger plan. The
implementer claims it is done. Your job is to verify two things independently:

1. **Spec compliance** — does the implementation deliver exactly what the task
   asked for? Nothing missing. Nothing extra. Did the implementer stay within
   the declared file scope?
2. **Correctness** — does the code actually work? Are there bugs, logic errors,
   broken edge cases, or design flaws the implementer missed?

You have full investigation tools. Read the actual files. Run the verification
command yourself — do not trust the implementer's self-report.

Do not comment on style, formatting, or trivia. Only surface issues that
genuinely affect spec satisfaction or correctness.

## Task Requirements
[Exact task text from the plan]

## Declared File Scope
[List of files the implementer was permitted to create or modify]

## Implementer's Reported Output
[The implementer subagent's full response, including any verification output it ran]

## Verification Command
[The exact command from the task, e.g. `npm test -- auth.test.ts`]

## Required Output Format
After your critique, end your response with EXACTLY this block as the final
lines (the scheduler parses these lines verbatim — no extra prose after them):

---
VERDICT: COMPLIANT
---

OR, if you found issues:

---
VERDICT: ISSUES
ISSUES:
- <file>:<line> — <one-line description of what's wrong and what needs to change>
- <file>:<line> — <next issue>
---

Use VERDICT: COMPLIANT only if both spec compliance and correctness pass. If
anything in either category fails, use VERDICT: ISSUES and list every issue.
```

**Parsing rule:** read the last `---`-delimited block of the rubber-duck response. The scheduler uses the `VERDICT:` line to decide; if `ISSUES`, it forwards the `ISSUES:` list to the next implementer iteration as fix instructions.

**Why rubber-duck:** independent reasoning that catches bugs and blind spots the implementer cannot see in their own work, while explicitly avoiding style/trivia noise. This is exactly what a compliance + correctness gate needs.

### Test Naming Convention

For tasks that write tests, include this in the implementer prompt:

```
Test method names must follow this pattern:
  When_<SomeAction>_Expect_<Result>

Examples:
  When_UserSubmitsEmptyForm_Expect_ValidationFails
  When_ValidTokenProvided_Expect_AuthSucceeds
  When_DuplicateEmail_Expect_RegistrationRejected
```

## Conflict Resolution

When a conflict is detected during the on-resume phase:

- **Same file modified by two finished agents** — try to merge. If changes are non-overlapping (different methods, different sections), keep both. If they overlap (same lines/blocks), keep the changeset whose task has better test coverage (or smaller diff if equal) and re-dispatch the other task with the merged file as input.
- **File modified outside declared scope** — handled per Phase 3 step 2: accept-and-update or revert-and-reissue.
- **Recurring conflicts on the same file across multiple iterations** — drop `CONCURRENCY` to 1 for the remaining tasks that touch that file.

## Falling Back to Sequential

If the scheduler encounters repeated conflicts or scope violations across multiple top-up cycles, drop `CONCURRENCY` to 1 for the remaining tasks and announce:

"Reducing concurrency to 1 — recent dispatches encountered [reason]. Remaining tasks will execute one at a time."

The loop is unchanged — only the concurrency cap moves.

## Blocking Rule

If a task fails compliance review 3 times, mark it `blocked` and free its slot. Do not let it wedge the loop. Surface to the human:

"Task <id> is blocked: [description]. Tests fail with [specific error]. 3 fix iterations did not resolve it. How would you like to proceed?"

At this point, consider invoking jds-debug for systematic root-cause analysis. Independent tasks continue running in their own slots — a single block does not stall the rest of the plan.

## No Committing

The scheduler writes and verifies code. It does not commit. Committing is the responsibility of the calling skill or the developer after the full workflow completes.

## Completion

When all tasks are `done` (no `pending`, no `in_progress`, possibly some `blocked`):

"All non-blocked plan tasks are complete. Using jds-finish for final verification and cleanup."

Invoke jds-finish.

## Common Mistakes

| Mistake | Why It Matters |
|---------|---------------|
| Invoking jds-execute without a confirmed plan file | The scheduler reads tasks from `docs/jds/plans/`. No plan → nothing to execute. Run jds-plan first. |
| Passing full plan to subagent | Context pollution — subagent makes assumptions from other tasks |
| Passing session history | Stale context causes incorrect implementations |
| Summarizing the implementer's output before passing it to the reviewer | The reviewer cannot critique what you do not show it. Pass the verbatim `result` text. |
| Trusting implementer's self-report | Implementers miss their own mistakes — independent rubber-duck review catches them |
| Overriding rubber-duck's `model` or `mode` | The platform picks the right model and synchronous mode by default. Setting them yourself defeats the agent's contract. |
| Skipping the structured VERDICT block in the reviewer prompt | The scheduler parses the verdict mechanically. Without the contract, every review needs human interpretation. |
| Waiting for all running tasks before topping up | The whole point of the scheduler is to dispatch the moment a slot frees |
| Skipping the file-overlap filter | Two agents editing the same file produces merge conflicts or data loss |
| Dispatching dependent tasks concurrently | Downstream task builds on incomplete foundation — guaranteed failure |
| Polling `list_agents` instead of yielding | Wastes turns. End the response and let the platform notify on completion. |
| Treating the yield as "task complete" or asking the user to re-prompt | The platform auto-resumes via system notification. Yielding is a wait, not a turn-end. Announce that you're waiting before yielding so the user knows. |
| Letting a blocked task wedge the loop | Mark blocked, free the slot, keep the rest of the plan moving |
| Using Opus for every task | Slow and expensive — Sonnet handles most tasks well |
| More than 3 fix iterations | Diminishing returns — the human needs to weigh in |
| Committing inside the loop | Not owned by this skill |
