---
name: jds-verify
description: Use before claiming any work is done, any bug is fixed, or any task is complete. Invoke before making success claims, before reporting completion to the user, or before handing off to jds-finish. Reasoning alone is not evidence - this skill requires running verification commands and showing concrete output.
---

# JDS Verify

**Type: Rigid** — follow exactly. Claims of completion without evidence are the single most common failure mode in AI-assisted development.

The agent must provide observable, concrete evidence of success. "I believe this works because..." is not verification. Running the tests and showing the output is verification.

## Required Before Claiming Done

Every completion claim must be backed by all of the following:

### 1. Run Relevant Tests

Run the specific tests for the code you changed. Show the output — not a summary, the actual command and its output.

```
$ mvn test -pl auth-module -Dtest="AuthValidatorTest"
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
  When_EmptyToken_Expect_AuthRejects ✓
  When_ValidToken_Expect_AuthSucceeds ✓
  When_ExpiredToken_Expect_AuthRejects ✓
```

### 2. Run Plan Verification Commands

If the task came from a plan, run the exact verification command specified in the plan. Not a similar command — the exact one. Show the output.

### 3. Confirm No Regressions

Run the full test suite (or the relevant module's test suite if the full suite is impractical). Show it passing.

If any pre-existing test fails, you have introduced a regression. Do not claim completion — route to jds-debug.

### 4. Show, Don't Tell

The verification section of your response must contain:
- The exact commands you ran
- The actual output of those commands
- A brief statement confirming the output matches expectations

It must NOT contain:
- "I believe this works because..."
- "The logic is correct because..."
- "This should work because..."
- Summary of what you think the tests would show
- Reasoning about why the code is correct

### 5. Verify Tracking Completeness

Before accepting any completion claim, confirm all tracked tasks are done:

```sql
SELECT id, title, status FROM todos WHERE status != 'done';
```

If any non-done todos exist, verification **fails**. List the incomplete items and route back to jds-execute (for pending/in_progress tasks) or jds-debug (for blocked tasks).

This prevents tasks from being silently skipped during execution.

## Failure Behavior

If any verification step fails:
1. Do not retry silently.
2. Do not claim partial success.
3. Surface the failure explicitly: what command failed, what the output was, what was expected instead.
4. Route to jds-debug for systematic diagnosis.

## Common Mistakes

| Mistake | Why It Matters |
|---------|---------------|
| "I verified by reading the code" | Reading is not running. Code that looks correct fails all the time. |
| Summarizing test output instead of showing it | Summaries hide failures. Show the actual output. |
| Running a subset of tests | You need both specific tests (did the change work?) and broad tests (did anything break?) |
| Claiming "tests pass" without output | No evidence = no verification |
| Retrying silently after failure | Hides information the human needs to make decisions |
