# Attribution

JDS is an adaptation of [superpowers](https://github.com/obra/superpowers) by
[@obra](https://github.com/obra) (Jesse Vincent), used under the
[MIT License](https://github.com/obra/superpowers/blob/main/LICENSE).

The core philosophy — skill-based enforcement of software development discipline
for AI coding agents — originates from that project. JDS adapts the concepts,
restructures the skills for the GitHub Copilot CLI plugin system, and adds
Copilot-specific features (SQL-based task tracking, interruption recovery, model
selection, and a domain-skill fast track).

## Derived Skills

The following JDS skills are conceptually derived from obra/superpowers
counterparts. The text has been substantially rewritten for this platform, but
the underlying methodology originates there.

| JDS skill | obra/superpowers origin | Notes |
|---|---|---|
| `skills/jds-tdd/` | [`skills/test-driven-development/`](https://github.com/obra/superpowers/tree/main/skills/test-driven-development) | SQL phase tracking and `When_Action_Expect_Result` naming convention are original to JDS |
| `skills/jds-debug/` | [`skills/systematic-debugging/`](https://github.com/obra/superpowers/tree/main/skills/systematic-debugging) | Escalation rule and SQL attempt tracking are original to JDS |
| `skills/jds-verify/` | [`skills/verification-before-completion/`](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion) | SQL tracking completeness check is original to JDS |
| `skills/jds-bootstrap/` | [`skills/using-superpowers/`](https://github.com/obra/superpowers/tree/main/skills/using-superpowers) | Domain Skill Fast Track and Skill Recommendation scoring are original to JDS |
| `skills/jds-plan/` | [`skills/writing-plans/`](https://github.com/obra/superpowers/tree/main/skills/writing-plans) | SQL task insertion and self-review steps are original to JDS |
| `skills/jds-execute/` | [`skills/subagent-driven-development/`](https://github.com/obra/superpowers/tree/main/skills/subagent-driven-development) + [`skills/executing-plans/`](https://github.com/obra/superpowers/tree/main/skills/executing-plans) | Model selection table, state-driven execution, and parallel dispatch integration are original to JDS |

## Original Skills

The following JDS skills have no direct equivalent in obra/superpowers:

- `skills/jds-refactor/` — safe structural refactoring with behavioral equivalence verification
- `skills/jds-finish/` — JDS artifact cleanup and SQL state teardown
- `skills/jds-think/` — design gate (structurally analogous to obra's `brainstorming` skill, but independently written)
- `skills/jds-parallel/` — wave-based parallel subagent dispatch

## Original Components

The following components are entirely original to JDS:

- `agents/` — code-reviewer, explainer, and tester agent definitions
- `commands/code-review.md` — PR and branch code review command
- `commands/security-audit-review.md` — read-only security audit command
- `instructions/copilot-instructions.md` — general-purpose Copilot instructions
- SQL-based task tracking system (`todos` / `todo_deps` schema used throughout)
- Interruption recovery via SQL state persistence
