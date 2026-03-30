---
allowed-tools: Bash(gh issue view:*), Bash(gh search:*), Bash(gh issue list:*), Bash(gh pr diff:*), Bash(gh pr view:*), Bash(gh pr list:*)
description: Code review a pull request or branch
---

# Code Review

Perform a thorough, signal-focused code review of the current branch or a specified PR.

Optional arguments:
- `--pr <number>` — review a specific GitHub pull request
- `--branch <name>` — review a specific branch (will ask which base branch to diff against)

---

## Step 1 — Determine scope

**If `--pr <number>` was provided:**
Run: `gh pr view <number> --json title,body,state,isDraft,headRefName,baseRefName`
If the PR is closed or draft, print: "Skipping: PR is closed or draft." and stop.
Store the PR title, description, head branch, and base branch for later steps.

**If `--branch <name>` was provided:**
Ask the user: "Which branch should `<name>` be diffed against? (e.g. main, develop)"
Wait for the user's answer. Store both as head branch and base branch.

**If neither was provided:**
Ask the user two questions:
1. "Which branch do you want to review?"
2. "Which branch should it be diffed against? (e.g. main, develop)"
   Wait for the user's answers. Store both.

---

## Step 2 — Get the diff and commit history

Run:
```
git fetch origin
git diff origin/<base>...origin/<head>
git log origin/<base>...origin/<head> --oneline
```

If the diff is fewer than 3 lines changed, print: "Skipping: diff is trivial." and stop.

Store the full diff and commit log. These are the only things under review.
**Do not comment on any code outside the changed lines.**

---

## Step 3 — Parallel bug detection (2 independent agents)

Launch two subagents simultaneously, each receiving the full diff and commit log.
Each agent works independently — they must not share intermediate findings.

### Agent 1 — Logic and correctness

Review the diff for:
- Logic errors: off-by-one, wrong boolean/comparison operators, unreachable branches
- Null / undefined / nil dereferences on values that could be absent
- Incorrect error handling: silently swallowing errors, broad catch-all handlers hiding real failures
- Missing boundary checks on arrays, slices, or collections
- Incorrect use of async/await, promises, or concurrency primitives
- Resource leaks: unclosed files, connections, streams, locks
- Incorrect state mutation or unexpected side effects
- Edge cases not handled: empty input, zero values, maximum values

### Agent 2 — Security and data integrity

Review the diff for:
- Hardcoded secrets, tokens, API keys, or passwords
- Input not validated or sanitized before use in queries, commands, or file paths
- SQL or command injection via string concatenation
- Sensitive data exposed in logs, error messages, or API responses
- Authentication or authorization checks missing on newly added endpoints or operations
- Insecure deserialization or unsafe type coercion
- Path traversal or directory escape risks
- Race conditions or TOCTOU (time-of-check/time-of-use) issues

---

Each agent returns its findings as a list. Each finding must include:
- File path and line range
- A one-sentence description of the problem
- Why it's a problem (what can go wrong)
- Severity: `CRITICAL`, `WARNING`, or `SUGGESTION`

---

## Step 4 — Validation pass

For every finding from Step 3, launch a dedicated validation subagent.
Each validation agent receives: the diff, the specific finding, and the file+line context.

The validation agent must answer:
1. Is the flagged line actually in the diff (not pre-existing code)?
2. Is the described problem actually present at that location in the code?
3. Could this be intentional given the PR title/description and surrounding context?
4. Is it suppressed by a lint-ignore, NOSONAR, or similar comment?

The validation agent assigns a confidence score (0–100):
- **90–100**: Clear, unambiguous issue. Include.
- **60–89**: Likely real but context-dependent. Include with a `(verify)` note.
- **Below 60**: Too uncertain. Drop silently.

Discard any finding that scores below 60 or that the validation agent determines is pre-existing, intentional, or suppressed.

---

## Step 5 — Output

Merge the surviving findings from both agents, deduplicate any overlapping issues, and sort by severity (CRITICAL first).

Print the review in this exact format:

---
## Code Review

**Branch:** `<head>` → `<base>`
**Commits reviewed:** <N> commits
**Files changed:** <N> files, <N> insertions, <N> deletions

---

### Issues (<N total — X critical, Y warnings, Z suggestions>)

**[CRITICAL]** `src/auth/login.go:42–48`
Token is compared with `==` instead of a constant-time comparison function.
Timing oracle attack: an attacker can infer valid tokens by measuring response time differences.

**[WARNING]** `lib/queue.js:117`
`shift()` is called on `pendingJobs` without checking if the array is empty.
Will return `undefined` and silently propagate through downstream processing. _(verify)_

---

### No issues found
(use this section instead if nothing survived the validation pass)
No issues found after running logic, security, and validation passes.

---

If no issues were found at all, end with:
"Reviewed <N> commits across <N> files. No high-confidence issues detected."
