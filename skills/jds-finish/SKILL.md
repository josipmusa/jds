---
name: jds-finish
description: Use when all tasks in a plan are marked done and jds-verify has passed. This skill handles final verification and cleanup of JDS working artifacts. It does NOT commit, push, or create PRs - those actions belong to the caller or the developer.
---

# JDS Finish

**Type: Rigid** — follow exactly. This is the final gate before handing control back.

This skill's only job is final verification and cleanup of JDS working artifacts. It does not commit, push, or create PRs. Those actions are the responsibility of the calling skill or the developer directly.

## Flow

### Step 1: Final Test Suite (Conditional)

Only run the full test suite if jds-verify has NOT already done so in this session. If jds-verify ran and the full suite passed, skip to Step 2.

If tests fail at any point: **stop.** Do not proceed. Route to jds-debug + jds-verify.

### Step 2: Update Existing Documentation

Check whether any existing documentation needs updating based on what the plan changed.

1. **Identify touched areas.** From the plan file or SQL task descriptions, list the source files, modules, classes, endpoints, or features that were modified.
2. **Scan for existing docs.** Look for markdown files (README, `docs/`) that reference those areas — by name, path, or concept.
3. **Patch what changed.** Update stale method signatures, parameter lists, endpoint paths, descriptions, or examples. Do not rewrite sections that are still accurate. Do not create new documentation.
4. **If nothing references the changed areas,** skip silently.

The final report (Step 6) notes whether docs were updated or no changes were needed.

### Step 3: Clean Up JDS Artifacts

Delete JDS working artifacts unconditionally:

1. Delete the spec file under `docs/jds/specs/` if it exists.
2. Delete the plan file under `docs/jds/plans/` if it exists.
3. Delete the `docs/jds/` directory if it is now empty (including parent `docs/` if also empty and was created by JDS).

These are AI working artifacts. They served their purpose during implementation and should not persist.

### Step 4: Clean Up Tracking State

Clear the SQL tracking state since all work has been verified complete:

```sql
DELETE FROM todo_deps;
DELETE FROM todos;
```

This prevents stale tracking data from interfering with future sessions. The completion count should be included in the final report (Step 6).

Record the count before deletion for the completion report:

```sql
SELECT count(*) as completed_tasks FROM todos WHERE status = 'done';
```

### Step 5: Verify No Artifacts in Git

Confirm that no files under `docs/jds/` are staged or committed in git.

- Run `git status` and check for any `docs/jds/` files in the staged or untracked sections.
- If any `docs/jds/` files are staged, unstage them immediately with `git reset HEAD docs/jds/`.
- Verify that `docs/jds/` is listed in `.gitignore`.
- If `.gitignore` was modified by JDS (to add `docs/jds/`), that change IS appropriate to keep — it prevents future accidental commits of JDS artifacts.

### Step 6: Report Completion

Report what was accomplished. Keep it brief and factual:

"Implementation complete. [N] tasks executed, all tests passing. Documentation: [updated / no changes needed]. JDS working artifacts cleaned up. Ready for commit/PR when you are."

Do not present commit/push/PR options. Do not ask what the user wants to do next with git. Those decisions are not owned by this skill.

If this skill was invoked by a calling skill or workflow, return control to it.

## Common Mistakes

| Mistake | Why It Matters |
|---------|---------------|
| Running full test suite when jds-verify already did | Wastes time — skip to cleanup |
| Creating new documentation | This step patches existing docs only — new docs are out of scope |
| Rewriting accurate documentation | If it's still correct, leave it alone |
| Leaving spec/plan files behind | They clutter the project and may confuse future sessions |
| Committing docs/jds/ files | AI artifacts do not belong in version control |
| Offering to commit or create a PR | Not owned by this skill — overstepping responsibility boundaries |
| Proceeding when tests fail | The implementation is broken — fix first |
