---
name: jds-think
description: Use before writing any code, asking clarifying questions, or taking any action on a task. This is the exploration, communication, and design gate — the most important skill in the suite. Every task that does not match a well-defined domain skill (per jds-bootstrap's Domain Skill Fast Track) passes through it, regardless of perceived simplicity. Invoke whenever implementation work is about to begin, when requirements are unclear, or when the user asks to build, add, fix, or change something. Also invoke for lightweight tasks that don't need a full design — jds-think scales down.
---

# JDS Think

**Type: Flexible** — adapt to project context, but the structure must be followed.

This is the most important skill in the JDS suite. It handles exploration, communication, and design. Getting this right prevents wasted implementation cycles. Every task passes through this gate — simple tasks get a short pass through it, complex tasks get a thorough one — **unless the task is fully covered by a well-defined domain skill** (see jds-bootstrap's Domain Skill Fast Track), in which case the domain skill replaces this gate.

**ask_user rule:** Every question to the user MUST go through the `ask_user` tool. Never ask questions by ending a message with plain text. This includes design confirmations, approach decisions, and spec approval.

## Flow

Follow these steps in order. Do not skip steps. The design can be brief for simple tasks, but each step must happen.

### Step 1: Explore First

Before asking the user anything, understand the current state:

- Read relevant existing code and understand the structure
- Check for existing patterns that should be followed or extended
- Identify potential conflicts, dependencies, and integration points
- Look at test patterns already in use

Arrive at the conversation already informed. The user should not have to explain their own codebase to you.

**After completing exploration, classify the task into exactly one tier:**

| Tier | Criteria | Examples |
|------|----------|----------|
| **Trivial** | A single, mechanical change in one file; full scope fits in one sentence; zero open questions; no design judgment needed | Fix a typo, update a version number, rename a variable, add a log line |
| **Moderate** | Well-defined scope, clear patterns to follow, few files affected; may require some judgment but the path forward is obvious | Add a new field to an existing model, implement a method following an established pattern, write a straightforward endpoint |
| **Complex** | Multiple systems, architectural decisions, unclear requirements, security/performance implications | New subsystem, cross-cutting refactor, performance-critical changes, new integration |

**When in doubt, always round UP.** If you're torn between Trivial and Moderate, choose Moderate. If torn between Moderate and Complex, choose Complex. Never hedge with combined labels like "Trivial to Moderate" — pick exactly one tier.

**Only classify as Trivial when ALL of these are true:**
1. The full scope fits in one sentence
2. There is zero ambiguity about what to do
3. It touches a single file in a single location
4. No design judgment is needed — a find-and-replace could almost do it

**Trivial path:** Skip Steps 3–5. Replace Steps 6–8 with a single `ask_user` confirmation describing the change in one sentence. Then proceed directly to jds-tdd — skip jds-plan. If the user responds with adjustments or questions that introduce ambiguity, immediately re-classify as Moderate and resume the full flow.

**Moderate path:** Skip Steps 4–5 (approach selection and sectional design review). Skip Steps 6–8 (no spec document needed — the task is clear enough). After Step 3 (clarifying questions, if any), proceed directly to jds-plan. The plan provides sufficient structure for well-defined tasks. From jds-plan, continue the normal pipeline: jds-execute → jds-verify → jds-finish.

**Complex path:** Follow all steps (1–9) without skipping anything.

### Step 2: Assess Scope

Before asking detailed questions, evaluate whether the request is appropriately scoped:

- If it describes multiple independent subsystems, raise it as the first priority. Drilling into specifics of an over-scoped request wastes everyone's time.
- Guide decomposition into independent sub-projects — identify the boundaries, dependencies, and a sensible build order.
- Each sub-project runs through the complete skill pipeline independently: think → plan → execute.
- For appropriately scoped requests, continue to Step 3.

### Step 3: Ask Clarifying Questions

Ask a single question at a time using `ask_user`. Bundling questions together gets superficial responses and glosses over important details.

- Default to multiple-choice with 2-3 options when the answer space is bounded. Lead with your recommended option.
- Do not ask for information that can be inferred from the codebase.
- Do not ask questions you could answer by reading existing code.
- Each question should resolve a genuine ambiguity that affects the design.

### Step 4: Propose Approaches

Present exactly 2-3 concrete approaches with explicit tradeoffs. Not a wall of options.

Each approach should include:
- A brief structural overview
- The concrete advantage it provides
- The tradeoff or limitation
- Why you do or don't recommend it

Use `ask_user` (with choices) to confirm which approach the user wants to proceed with.

### Step 5: Present Design in Sections

Walk the user through the design one section at a time. Keep each section concise enough that they'll actually read it rather than skimming. After each section, use `ask_user` to confirm before proceeding to the next.

Long monolithic designs get rubber-stamped. Sectional presentation forces genuine engagement with each piece.

### Step 6: Write Spec Document

Save to `docs/jds/specs/YYYY-MM-DD-<feature-name>.md`. Do NOT commit this file.

Before writing, ensure `docs/jds/` is present in `.gitignore`. If it is not, add it. These are AI working artifacts — they do not belong in version control.

**Spec template:**

```markdown
# [Feature Name] Spec

**Goal:** [One sentence — what this achieves for the user]

**Approach:** [Which approach was chosen and why]

## Modules/Components Affected
- [List each file or module that will be created or modified]

## Interface Changes
[Public API endpoints, component props/contracts, function signatures, CLI commands, events — or "None"]

## Data / State Changes
[Schema changes, new tables/fields, state shape, store structure, configuration — or "None"]

## Testing Strategy
- **Unit:** [What gets unit tested]
- **Integration:** [What gets integration tested]
- **E2E:** [What gets e2e tested, or "N/A"]

## Out of Scope
- [Explicit list of things this spec does NOT cover]
```

### Step 7: Spec Self-Review

After writing the spec, review it inline. No subagent dispatch needed. Check:

1. **Incomplete items:** Search for "TBD", "TODO", or hand-wavy phrases like "handle appropriately." Replace each with a concrete decision.
2. **Internal conflicts:** Do any sections promise contradictory behavior? Resolve them now.
3. **Scope creep:** Can this be implemented as a single plan, or has it grown to need decomposition?
4. **Double meanings:** Would two engineers read any requirement differently? Nail it down.

Fix all issues inline before proceeding.

### Step 8: Human Confirmation

Use `ask_user` to ask the user to confirm the spec before continuing:

```
ask_user(
  question="I've saved the spec to docs/jds/specs/YYYY-MM-DD-<feature-name>.md. Does everything look correct, or do you want to adjust anything before I proceed to planning?",
  choices=["Looks good — proceed to planning", "I have adjustments"]
)
```

Do not continue to planning until the user confirms.

### Step 9: Handoff

Announce the transition and invoke jds-plan:

"Using jds-plan to create the implementation plan from the confirmed spec."

## Common Mistakes

| Mistake | Why It Matters |
|---------|---------------|
| Asking the user to explain code you could read | Wastes their time and signals laziness |
| Combining multiple questions | Gets shallow, incomplete answers |
| Ending a message with a plain-text question | Breaks the session — use ask_user instead |
| Skipping scope assessment | Leads to monolithic plans that fail mid-execution |
| Presenting 5+ approaches | Paralyzes decision-making — 2-3 is the sweet spot |
| Writing the spec without sectional review | User rubber-stamps designs they didn't read |
| Leaving TBDs in the spec | TBDs become bugs in the plan |
