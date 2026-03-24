---
name: jds-design
description: Use before writing any code for a new feature, significant change, or non-trivial task. This is the design and requirements gate - every task goes through it, including ones that seem "simple." Invoke whenever implementation work is about to begin, when requirements are unclear, or when the user asks to build, add, fix, or change something.
---

# JDS Design

**Type: Flexible** — adapt to project context, but the structure must be followed.

This is the most important skill in the JDS suite. Getting the design right prevents wasted implementation cycles. Every task passes through this gate — simple tasks get a short design, complex tasks get a thorough one.

## Flow

Follow these steps in order. Do not skip steps. The design can be brief for simple tasks, but each step must happen.

### Step 1: Explore First

Before asking the user anything, understand the current state:

- Read relevant existing code and understand the structure
- Check for existing patterns that should be followed or extended
- Identify potential conflicts, dependencies, and integration points
- Look at test patterns already in use

Arrive at the conversation already informed. The user should not have to explain their own codebase to you.

### Step 2: Assess Scope

Before asking detailed questions, evaluate whether the request is appropriately scoped:

- If it describes multiple independent subsystems, flag this immediately. Do not spend questions refining details of a project that needs decomposition.
- Help the user split into sub-projects: what are the independent pieces, how do they relate, what order should they be built?
- Each sub-project gets its own full jds-design, jds-plan, jds-execute cycle.
- For appropriately scoped requests, continue to Step 3.

### Step 3: Ask Clarifying Questions

One question per message. Never combine multiple questions in a single message — this leads to shallow answers and missed nuance.

- Prefer multiple-choice where possible. Give 2-3 options with your recommendation.
- Do not ask for information that can be inferred from the codebase.
- Do not ask questions you could answer by reading existing code.
- Each question should resolve a genuine ambiguity that affects the design.

### Step 4: Propose Approaches

Present exactly 2-3 concrete approaches with explicit tradeoffs. Not a wall of options.

For each approach:
- What it looks like (brief structural description)
- What it gains (specific benefit)
- What it costs (specific drawback)
- Your recommendation and reasoning

### Step 5: Present Design in Sections

Break the design into digestible sections for human review. Each section should be short enough to actually read and evaluate. Wait for confirmation before proceeding to the next section.

This prevents the "wall of text" problem where the user rubber-stamps a design they didn't actually read.

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

## API Contract Changes
[Endpoints, request/response shapes — or "None" if no API changes]

## Data Model Changes
[Schema changes, new tables/fields — or "None" if no data model changes]

## Testing Strategy
- **Unit:** [What gets unit tested]
- **Integration:** [What gets integration tested]
- **E2E:** [What gets e2e tested, or "N/A"]

## Out of Scope
- [Explicit list of things this spec does NOT cover]
```

### Step 7: Spec Self-Review

After writing the spec, review it inline. No subagent dispatch needed. Check:

1. **Placeholders:** Any TBDs, TODOs, or vague phrases like "appropriate handling"? Fix them.
2. **Contradictions:** Do any sections contradict each other? Resolve them.
3. **Scope:** Is this focused enough for a single implementation plan, or does it need decomposition?
4. **Ambiguity:** Could any requirement be interpreted two different ways? Clarify it.

Fix all issues inline before proceeding.

### Step 8: Human Confirmation

Ask the user to review the saved spec file. Do not continue until they confirm.

"I've saved the spec to `docs/jds/specs/YYYY-MM-DD-<feature-name>.md`. Please review it and let me know if anything needs adjustment before I proceed to planning."

### Step 9: Handoff

Announce the transition and invoke jds-plan:

"Using jds-plan to create the implementation plan from the confirmed spec."

## Common Mistakes

| Mistake | Why It Matters |
|---------|---------------|
| Asking the user to explain code you could read | Wastes their time and signals laziness |
| Combining multiple questions | Gets shallow, incomplete answers |
| Skipping scope assessment | Leads to monolithic plans that fail mid-execution |
| Presenting 5+ approaches | Paralyzes decision-making — 2-3 is the sweet spot |
| Writing the spec without sectional review | User rubber-stamps designs they didn't read |
| Leaving TBDs in the spec | TBDs become bugs in the plan |
