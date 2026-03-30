---
name: jds-think
description: Use before writing any code, asking clarifying questions, or taking any action on a task. This is the exploration, communication, and design gate — the most important skill in the suite. Every task passes through it, regardless of perceived simplicity. Invoke whenever implementation work is about to begin, when requirements are unclear, or when the user asks to build, add, fix, or change something. Also invoke for lightweight tasks that don't need a full design — jds-think scales down.
---

# JDS Think

**Type: Flexible** — adapt to project context, but the structure must be followed.

This is the most important skill in the JDS suite. It handles exploration, communication, and design. Getting this right prevents wasted implementation cycles. Every task passes through this gate — simple tasks get a short pass through it, complex tasks get a thorough one.

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

### Step 2: Assess Scope

Before asking detailed questions, evaluate whether the request is appropriately scoped:

- If it describes multiple independent subsystems, flag this immediately. Do not spend questions refining details of a project that needs decomposition.
- Help the user split into sub-projects: what are the independent pieces, how do they relate, what order should they be built?
- Each sub-project gets its own full jds-think, jds-plan, jds-execute cycle.
- For appropriately scoped requests, continue to Step 3.

### Step 3: Ask Clarifying Questions

One question per message via `ask_user`. Never combine multiple questions — this leads to shallow answers and missed nuance.

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

Use `ask_user` (with choices) to confirm which approach the user wants to proceed with.

### Step 5: Present Design in Sections

Break the design into digestible sections for human review. Each section should be short enough to actually read and evaluate. After each section, use `ask_user` to confirm before proceeding to the next.

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
