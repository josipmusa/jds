---
name: jds-tdd
description: Use when writing any code during implementation - enforces the RED-GREEN-REFACTOR TDD cycle. This is a rigid skill that cannot be adapted or skipped. Invoke whenever code is being written as part of a feature, bugfix, or any implementation task.
---

# JDS TDD

**Type: Rigid** — follow exactly. No adaptation, no shortcuts, no "just this once."

Enforces the test-driven development cycle during implementation. The cycle exists because writing tests after implementation is a fundamentally different (and weaker) activity than writing tests before — it tests what you built rather than what you intended.

## The Cycle

Strictly in this order, every time:

### 1. RED — Write One Failing Test

Write one minimal test that expresses exactly the required behavior. Run it. Confirm it fails with the expected error.

If the test passes immediately, the test is wrong. It is not testing new behavior — it is confirming something that already exists. Delete it and write a test that actually exercises the new requirement.

### 2. GREEN — Minimum Implementation

Write the absolute minimum code to make the test pass. Not clean. Not clever. Not "well-architected." Minimum.

The goal is to prove the test works by making it pass with the simplest possible code. Elegance comes in the next step.

### 3. REFACTOR — Clean Up

Now — and only now — clean up the implementation while keeping all tests green. Extract abstractions, improve naming, remove duplication. Run tests after every change to confirm nothing broke.

## Phase Tracking

Track each TDD phase in the SQL tracking system to enable interruption recovery mid-cycle:

**Before RED:**
```sql
INSERT INTO todos (id, title, status) VALUES ('{task-id}-red', 'RED: Write failing test for {task-id}', 'in_progress');
INSERT INTO todo_deps (todo_id, depends_on) VALUES ('{task-id}-red', '{task-id}');
```

**After RED (test confirmed failing):**
```sql
UPDATE todos SET status = 'done', updated_at = datetime('now') WHERE id = '{task-id}-red';
```

**Before GREEN:**
```sql
INSERT INTO todos (id, title, status) VALUES ('{task-id}-green', 'GREEN: Minimum implementation for {task-id}', 'in_progress');
INSERT INTO todo_deps (todo_id, depends_on) VALUES ('{task-id}-green', '{task-id}');
```

**After GREEN (test passing):**
```sql
UPDATE todos SET status = 'done', updated_at = datetime('now') WHERE id = '{task-id}-green';
```

**Before REFACTOR:**
```sql
INSERT INTO todos (id, title, status) VALUES ('{task-id}-refactor', 'REFACTOR: Clean up {task-id}', 'in_progress');
INSERT INTO todo_deps (todo_id, depends_on) VALUES ('{task-id}-refactor', '{task-id}');
```

**After REFACTOR (tests still green):**
```sql
UPDATE todos SET status = 'done', updated_at = datetime('now') WHERE id = '{task-id}-refactor';
```

Replace `{task-id}` with the parent task's SQL todo ID (e.g., `task-1-create-auth-validator`).

## Test Naming Convention

Test method names must follow this pattern:

```
When_<SomeAction>_Expect_<Result>
```

Examples:
- `When_UserSubmitsEmptyForm_Expect_ValidationFails`
- `When_ValidTokenProvided_Expect_AuthSucceeds`
- `When_DuplicateEmail_Expect_RegistrationRejected`
- `When_ConnectionTimeout_Expect_RetryTriggered`

This convention is non-negotiable. It applies to every test written under the JDS suite. The pattern makes test intent immediately clear from the method name alone — when reading a test failure report, you know exactly what scenario failed without reading the test body.

## Hard Rules

**If code was written before a test exists, delete it.** Start over with the test first. There are no exceptions for "exploration code," "reference implementations," or "I just wanted to see if it works." The RED step must come first.

**Never fix a bug without first writing a failing test that reproduces it.** The test is proof you understood the bug. Without it, you are guessing at the fix and have no regression protection.

**Watching the test fail is not optional.** A test you have not seen fail is a test you do not know actually tests the right thing. The RED step exists to verify the test itself — skipping it means you might be testing nothing.

## Rationalization Blocker

| Thought | Reality |
|---------|---------|
| "I'll write tests after — I just need to see if this approach works" | That is prototyping, not implementation. If you want to explore, use a scratch file. The real implementation starts with a test. |
| "It's too simple to need a test" | Simple code that breaks in production is not simple. The test takes 30 seconds to write and prevents hours of debugging. |
| "The test would just mirror the implementation" | Then the implementation is trivial and the test is fast to write. If the test truly mirrors the code, the code might be too tightly coupled to its implementation — consider testing behavior instead. |
| "I already wrote the code and it works" | You wrote untested code. Delete it. Write the test. Watch it fail. Rewrite the code. This is not wasted effort — it is the process that produces reliable software. |
| "This is just a configuration change" | Configuration changes break systems. Test the behavior the configuration enables. |

## Testing Anti-Patterns

When adding mocks or test utilities, read @testing-anti-patterns.md to avoid common pitfalls:
- Testing mock behavior instead of real behavior
- Adding test-only methods to production classes
- Mocking without understanding dependencies
- Incomplete mocks that hide structural assumptions
- Tests treated as an afterthought

**Core principle:** Test what the code does, not what the mocks do. If you are verifying that a mock was called rather than testing a real effect, you have gone wrong.

## Integration with Other Skills

- **jds-execute** dispatches implementer subagents that must follow this cycle.
- **jds-debug** requires a failing test before any fix attempt.
- **jds-verify** checks that tests exist and pass before accepting completion claims.
