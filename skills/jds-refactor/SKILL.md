---
name: jds-refactor
description: Use when restructuring code without changing behavior — renaming, extracting methods, moving classes, simplifying logic, reducing duplication, or improving readability. Invoke when the user asks to refactor, clean up, restructure, reorganize, simplify, or improve code quality without adding features. Also use when jds-debug or code review identifies structural issues that need resolution.
---

# JDS Refactor

**Type: Rigid** — follow exactly. Refactoring without test coverage is not refactoring — it is rewriting, and rewriting breaks things.

The defining rule of refactoring: **behavior must not change**. Every step must be provably behavior-preserving. If tests don't exist to prove it, write them first.

## Prerequisites

Before any structural change:

1. **Identify the refactoring scope.** Which files, classes, methods, or modules will be restructured?
2. **Verify test coverage exists.** Run the existing tests for the affected code. If they pass, you have a behavioral baseline. If no tests exist, you must write them first (Step 1 below).

## The Refactoring Loop

### Step 1: Establish Behavioral Baseline

If the code under refactoring lacks test coverage, **write characterization tests first**.

Characterization tests capture what the code *actually does* — not what it *should* do. They are the safety net.

```
Test naming convention:
  When_<CurrentBehavior>_Expect_<ActualResult>

Examples:
  When_EmptyInputProvided_Expect_ReturnsNull
  When_NegativeAmount_Expect_ThrowsIllegalArgument
  When_DuplicateKey_Expect_LastValueWins
```

Run all characterization tests. They must all pass. Save the test output — this is your **behavioral baseline**.

```sql
INSERT INTO todos (id, title, description, status)
VALUES ('refactor-baseline', 'Establish behavioral baseline',
        'Write characterization tests and verify all pass', 'in_progress');
```

### Step 2: Plan the Refactoring

List each discrete structural change. Each change should be:
- **Atomic:** One rename, one extraction, one move — not "reorganize everything"
- **Independently verifiable:** Tests still pass after each change
- **Reversible:** Can be undone with `git checkout` if tests break

Track changes in SQL:

```sql
INSERT INTO todos (id, title, description, status) VALUES
  ('refactor-step-1', 'Extract validation logic', 'Extract validateInput() from processOrder()', 'pending'),
  ('refactor-step-2', 'Rename OrderProcessor to OrderService', 'Update all references', 'pending'),
  ('refactor-step-3', 'Move shared DTOs to common module', 'Transfer OrderDTO, CustomerDTO', 'pending');
```

### Step 3: Execute One Change at a Time

For each refactoring step:

1. **Make the structural change.** One change only.
2. **Run all tests immediately.** Not "after a few changes" — after *each individual change*.
3. **If tests pass:** Mark step done, proceed to next.
4. **If tests fail:** The change broke behavior. Revert it immediately (`git checkout -- <files>`). Analyze why. Reattempt with a smaller, safer change.

```sql
UPDATE todos SET status = 'in_progress' WHERE id = 'refactor-step-1';
-- Make the change, run tests
UPDATE todos SET status = 'done' WHERE id = 'refactor-step-1';
```

**Never batch multiple structural changes before running tests.** This is the most common refactoring mistake — you make 5 changes, tests break, and you can't tell which change caused the failure.

### Step 4: Verify Behavioral Equivalence

After all refactoring steps complete:

1. Run the full test suite (not just the affected tests)
2. Compare test output against the behavioral baseline from Step 1
3. Same number of tests, same pass/fail results = behavioral equivalence confirmed
4. Any new failures = regression introduced — revert the last change and investigate

### Step 5: Clean Up

After verification:
- Remove any temporary scaffolding (helper methods added only for the refactoring)
- Update imports and references across the codebase
- Run tests one final time

## Refactoring Catalog

Common refactoring patterns and when to apply them:

| Pattern | When to Use | Risk Level |
|---------|-------------|------------|
| **Rename** (variable, method, class) | Name doesn't communicate intent | Low |
| **Extract Method** | Method is too long or does multiple things | Low |
| **Extract Class** | Class has too many responsibilities | Medium |
| **Move Method/Class** | Logic is in the wrong module | Medium |
| **Inline** | Abstraction adds complexity without value | Low |
| **Replace Conditional with Polymorphism** | Switch/if chains on type | High |
| **Introduce Parameter Object** | Method has 4+ parameters | Medium |
| **Replace Magic Numbers/Strings** | Literal values without explanation | Low |
| **Simplify Boolean Expression** | Complex conditions hard to read | Low |
| **Remove Dead Code** | Code is unreachable or unused | Low |

**High-risk refactorings** (Extract Class, Replace Conditional) should be broken into multiple low-risk steps.

## What Refactoring is NOT

| This is refactoring | This is NOT refactoring |
|--------------------|-----------------------|
| Renaming for clarity | Adding a new feature |
| Extracting a method | Changing method behavior |
| Simplifying a conditional | Adding a new conditional branch |
| Moving code to a better location | Deleting functionality |
| Reducing duplication | Optimizing performance (this is optimization, not refactoring) |
| Improving readability | Changing API contracts |

If you find yourself adding behavior or changing contracts, stop. That is implementation work — invoke jds-think and jds-plan instead.

## Scope Discipline

Do not expand scope during refactoring. If you discover:
- A bug → Note it, but do not fix it during refactoring. File it for later.
- A missing feature → Note it, do not add it.
- An optimization opportunity → Note it, do not pursue it.

Mixing refactoring with behavior changes makes it impossible to verify that behavior is preserved.

## Common Mistakes

| Mistake | Why It Matters |
|---------|---------------|
| Refactoring without tests | No way to verify behavior is preserved — you're guessing |
| Batching multiple changes | Can't isolate which change broke the tests |
| Changing behavior during refactoring | Violates the fundamental rule — now it's a rewrite |
| Skipping the baseline | No reference point to compare against |
| Expanding scope | "While I'm here" leads to tangled changes and hidden regressions |
| Not running tests after each step | Delayed feedback makes root-cause analysis exponentially harder |
| Refactoring untested code without characterization tests | Flying blind |
