---
name: jds-debug
description: Use when encountering any bug, test failure, unexpected behavior, or error at any phase of development. Invoke before attempting any fix - this skill prevents symptom-patching by enforcing systematic root-cause analysis. Also use when a fix attempt has already failed and you need a structured approach.
---

# JDS Debug

**Type: Rigid** — follow exactly. Systematic debugging prevents the most expensive failure mode in software development: fixing symptoms instead of causes.

Symptom fixes are failures. They appear to work, pass a quick check, and then break again — often in a worse way — days or weeks later. This skill exists to prevent that pattern.

## The Four Phases

Complete these in order. Do not skip to the fix.

### Phase 1: Investigate

Gather evidence before forming any theory.

- **Read error messages completely.** Not the first line — the entire stack trace, every detail. The root cause is often buried in the middle or end of the error output.
- **Trace data flow through component boundaries.** Log or inspect what enters and exits each layer. The bug lives at the boundary where output diverges from expectation.
- **Identify the failing layer.** Is it the database? The API? The business logic? The UI? Do not guess — trace until you can point to the specific layer.
- **Check recent changes.** What changed since this last worked? Use `git log`, `git diff`, and `git blame` to narrow the timeline.

### Phase 2: Analyze

Look for patterns once you have evidence.

- Does this failure happen elsewhere in the codebase? Search for similar patterns.
- Is this a systemic issue (wrong assumption used everywhere) or isolated (one bad call site)?
- Are there related bugs in the issue tracker or commit history?
- What is the minimal reproduction case?

### Phase 3: Hypothesize

Form one specific, testable hypothesis. State it explicitly.

Good hypothesis: "The auth middleware is rejecting the request because the token expiry check uses UTC but the token was issued with local time."

Bad hypothesis: "Something is wrong with authentication." — This cannot be tested because it does not predict a specific behavior.

If your hypothesis cannot be tested with observable evidence, it is not a hypothesis. Refine it until it is specific enough to prove or disprove.

### Phase 4: Fix

1. **Write a failing test that reproduces the bug.** This test is proof you understood the root cause. If you cannot write a test that fails for the reason you hypothesized, your hypothesis is wrong — go back to Phase 3.
2. **Fix the root cause.** Not the symptom. The actual cause identified in your hypothesis.
3. **Confirm the test passes.** Run the specific test.
4. **Check for regressions.** Run the broader test suite to confirm nothing else broke.
5. **Look for siblings.** If this bug was caused by a wrong assumption, search for the same assumption elsewhere. Fix all instances, not just the one that surfaced.

## Iteration Tracking

Track each debug attempt in the SQL tracking system. This provides data for the 3-attempt escalation rule and enables resumption if debugging is interrupted.

**At the start of each debug attempt:**
```sql
INSERT INTO todos (id, title, description, status)
VALUES ('debug-N-investigate', 'Debug attempt N: Investigate', 'Gathering evidence for hypothesis', 'in_progress');
```

**Track each phase completion (example: Investigate → Analyze):**
```sql
UPDATE todos SET status = 'done', updated_at = datetime('now') WHERE id = 'debug-N-investigate';
INSERT INTO todos (id, title, status) VALUES ('debug-N-analyze', 'Debug attempt N: Analyze', 'in_progress');
```

Continue the same pattern through all four phases: `debug-N-investigate` → `debug-N-analyze` → `debug-N-hypothesize` → `debug-N-fix`

**Enforce the escalation rule via SQL:**
```sql
SELECT count(*) FROM todos WHERE id LIKE 'debug-%-fix' AND status = 'blocked';
```
If count >= 3, escalate to the human immediately.

**On successful fix:** mark all debug todos for that attempt as `done`.
**On failed fix:** mark the fix todo as `blocked`:
```sql
UPDATE todos SET status = 'blocked', updated_at = datetime('now') WHERE id = 'debug-N-fix';
```

## Escalation Rule

If 3 or more fix attempts fail, **stop.** Do not try a fourth fix. Surface the situation to the human and question whether the architecture itself is the problem.

"I've attempted 3 fixes for this issue and none have resolved it. The pattern of failures suggests [observation]. This may indicate an architectural issue rather than a localized bug. How would you like to proceed?"

Continuing to apply fixes after 3 failures is almost always wasted effort — the problem is likely structural, and structural problems need human judgment about acceptable tradeoffs.

## Techniques Reference

### Backward Call-Stack Tracing

Start from the error and trace backward through the call stack:
1. Identify the exact line that throws/fails
2. What called that function? What arguments were passed?
3. Where did those arguments come from?
4. Continue backward until you find the first point where data diverges from expectation

This is more efficient than forward tracing (starting from input) because it narrows the search space immediately — you start at the failure and work toward the cause, rather than following all possible paths forward.

### Defense-in-Depth Validation

After finding and fixing the root cause, add validation at multiple layers to prevent the same class of bug:

1. **At the source:** Validate where the bad data originates
2. **At the boundary:** Validate where data crosses component boundaries
3. **At the consumer:** Validate where data is used

This is not defensive programming for its own sake — it is targeted hardening of a path that has already proven it can fail.

## Common Mistakes

| Mistake | Why It Matters |
|---------|---------------|
| Jumping to fix without investigating | You fix the symptom, not the cause |
| Reading only the first line of an error | Root cause is often in the middle of the stack trace |
| Forming a hypothesis without evidence | Confirmation bias makes you see evidence that isn't there |
| Fixing without a reproducing test | No proof the fix addresses the actual bug |
| Stopping after one instance | Same assumption likely exists elsewhere |
| More than 3 fix attempts | The problem is probably structural — escalate |
