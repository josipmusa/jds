# Copilot Instructions

## About This Project

**JDS** is a GitHub Copilot CLI plugin that enforces a structured software development lifecycle through a suite of skills: `jds-think`, `jds-plan`, `jds-execute`, `jds-tdd`, `jds-debug`, `jds-verify`, and `jds-finish`. The plugin is defined in `plugin.json`, skills live under `skills/`, and custom agents live under `agents/`.

---

## Git Workflow

**Never perform any git action unless the user explicitly asks for it.**

### Commit only
When the user asks to **commit**:
1. Stage the relevant changes and commit them locally. Nothing more.

### Commit + Push
When the user asks to **commit and push**:
1. Pull latest `master` to get a clean starting point.
2. Create a new branch from `master` named for the feature/fix being implemented.
3. Commit the changes to that branch.
4. Push the branch to origin.

### Full Flow — Commit + Push + PR
When the user asks to **create a PR** (or "open a pull request", or similar):
1. Pull latest `master`.
2. Create a new branch from `master` named for the feature/fix.
3. Commit and push the changes to that branch.
4. Open a PR targeting `master` with a descriptive title and body summarising the changes.

---

## Making a Release

When the user asks to make a release:
1. Read the current version from `plugin.json` (e.g. `"version": "1.0.0"`).
2. Find the most recent git tag. If no tag exists, all commits are considered new.
3. Collect all commit messages since the last tag to use as the release description. If no tag exists, the description should simply state **"Initial release."**
4. Create and push an annotated git tag matching the version (e.g. `v1.0.0`).
5. Create a GitHub release targeting that tag with the collected commit summary as the release description.
