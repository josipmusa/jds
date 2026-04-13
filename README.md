# JDS

**A skill suite that makes your AI coding assistant follow a real software development process.**

JDS is a [GitHub Copilot CLI](https://github.com/features/copilot/cli) plugin that enforces structured workflows — design before code, tests before implementation, evidence before completion claims. It turns your AI pair programmer from a code-spewing autocomplete into a disciplined software engineer that can work for hours on complex tasks without losing context or getting lost.

## Why?

AI coding assistants are powerful but undisciplined. Without structure, they:

- Skip design and jump straight to code
- Write tests after implementation (or not at all)
- Claim "it works" without running anything
- Lose track of progress mid-task
- Fix symptoms instead of root causes

JDS fixes this by enforcing a skill-based workflow that gates every phase of development.

## The Workflow

```
User Request
    ↓
jds-think       → Explore, clarify, design, write spec
    ↓
jds-plan        → Break spec into atomic, verifiable tasks
    ↓
jds-execute     → Execute tasks via isolated subagents
    ├── jds-tdd     → RED → GREEN → REFACTOR (every time)
    └── jds-debug   → Systematic root-cause analysis (when things break)
    ↓
jds-verify      → Evidence-based completion (actual output, not "I think it works")
    ↓
jds-finish      → Clean up working artifacts
```

Every task passes through this pipeline. Simple tasks get a lightweight pass. Complex tasks get the full treatment. But nothing skips the process entirely.

## Skills

| Skill | Type | What It Does |
|-------|------|-------------|
| **jds-bootstrap** | Flexible | Session entry point. Enforces skill-check before any action. |
| **jds-think** | Flexible | The design gate. Explores codebase, asks clarifying questions, proposes approaches, writes specs. |
| **jds-plan** | Flexible | Translates specs into atomic tasks (2-5 min each). No placeholders, no hand-waving. |
| **jds-execute** | Flexible | Runs tasks via isolated subagents. Each gets only what it needs — never session history. |
| **jds-parallel** | Flexible | Wave-based parallel dispatch for independent tasks. Handles conflict detection and sequential fallback. |
| **jds-tdd** | Rigid | Enforces RED-GREEN-REFACTOR. Tests first, always. Code written before tests? Delete it. |
| **jds-refactor** | Rigid | Safe structural changes with behavioral equivalence verification. Tests must pass before and after. |
| **jds-debug** | Rigid | 4-phase root-cause analysis: Investigate → Analyze → Hypothesize → Fix. No symptom-patching. |
| **jds-verify** | Rigid | Requires actual command output as evidence. "I believe this works" is not verification. |
| **jds-finish** | Rigid | Cleans up specs, plans, and tracking state. Does not commit — that's your job. |

**Rigid** skills follow exact protocols. No adaptation, no shortcuts.
**Flexible** skills adapt to context but maintain their structure.

## Agents

| Agent | Role |
|-------|------|
| **explainer** | Translates code and systems into clear explanations |
| **code-reviewer** | Senior reviewer focused on security, quality, and correctness |
| **tester** | QA engineer that writes tests using `When_Action_Expect_Result` naming |

## Commands

| Command | What It Does |
|---------|-------------|
| **code-review** | Reviews current branch or a specific PR |
| **security-audit-review** | Deep security audit — read-only, produces a report |

## Visualization

JDS ships a task graph visualization server (`tools/viz`) that renders your session's todo dependency graph in real time. It starts automatically when `jds-execute` begins and shuts down when the session ends.

```
Task visualization running at http://localhost:3847
```

The UI shows each task as a node, colored by status:

| Color | Status |
|-------|--------|
| 🔵 Blue (pulsing) | `in_progress` |
| 🔴 Red (pulsing) | `blocked` |
| 🟢 Green | `done` |
| ⬜ Neutral | `pending` |

Edges represent dependencies — an arrow from A to B means B depends on A. The graph updates live via WebSocket as tasks change state. If port 3847 is in use, the server picks the next free port automatically.

Note: The visualization server may take longer to complete npm install and npm run build, depending on your environment. To avoid delays, you can run these steps in advance to generate the dist/ folder, or instruct your agent to execute them before starting your first JDS session.

## Installation

### Step 1: Add the marketplace

```bash
copilot plugin marketplace add josipmusa/jds
```

### Step 2: Install the plugin

```bash
copilot plugin install jds@jds-marketplace
```

Or, from within an interactive Copilot CLI session, use the slash command equivalents:

```
/plugin marketplace add josipmusa/jds
/plugin install jds@jds-marketplace
```

## Quick Start

Once installed, JDS activates automatically at session start - no need to invoke skills manually. The typical flow for any non-trivial task:

```
jds-think      → clarify requirements, write a spec
jds-plan       → break the spec into atomic tasks
jds-execute    → implement via isolated subagents (TDD enforced)
jds-verify     → confirm everything works with real output
jds-finish     → clean up working artifacts
```

## Key Principles

### Design Before Code
Every task passes through `jds-think` before any code is written. A 2-minute design for a simple task is fine. Skipping design entirely is not.

### Tests Before Implementation
`jds-tdd` enforces RED-GREEN-REFACTOR on every code change. If code exists before a test, delete it and start over. This is not negotiable.

### Evidence Over Claims
`jds-verify` requires actual command output — not summaries, not reasoning, not "I believe this works." Run the tests. Show the output.

### Context Isolation
Subagents never inherit session history. Each task gets a focused, self-contained prompt with only what it needs. This prevents stale assumptions and forces verifiable outputs.

### No Placeholders
Plans contain complete code, not "add validation" or "handle edge cases." Every task must be executable by a subagent without inferring intent.

## Copilot Instructions

JDS ships with a set of general-purpose copilot instructions at [`instructions/copilot-instructions.md`](instructions/copilot-instructions.md) — inspired by [Andrej Karpathy's coding agent guidelines](https://github.com/forrestchang/andrej-karpathy-skills/blob/main/CLAUDE.md). These are opinionated defaults that complement the skill suite:

- **Think before coding** — state assumptions, surface ambiguity, ask instead of guessing
- **Simplicity first** — minimum code that solves the problem, no speculative abstractions
- **Surgical changes** — change only what's requested, match existing patterns
- **Goal-driven execution** — define success criteria with exact verification commands
- **No design artifacts in commits** — JDS working files are cleaned up before any git operation

We recommend copying these instructions into your global Copilot instructions file (typically `~/.copilot/copilot-instructions.md`) so they apply across all your projects. If you already have your own instructions, JDS respects the priority chain: your instructions > JDS skills > system defaults.

## Acknowledgements

JDS is an adaptation of the [superpowers](https://github.com/obra/superpowers) repository by [@obra](https://github.com/obra) (Jesse Vincent), used under the MIT License. The core philosophy — skill-based enforcement of software development discipline for AI agents — originates from that project. JDS adapts the concepts, restructures the skills for Copilot's plugin system, and adds Copilot-specific features like SQL-based task tracking. See [ATTRIBUTION.md](ATTRIBUTION.md).

## License

MIT
