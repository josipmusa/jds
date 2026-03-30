# Copilot Instructions

## 0. Rule Precedence
- These rules are ordered by priority
- If a lower section conflicts with a higher one, **follow the higher section**

---

## 1. Mandatory Post-Prompt Step
- After completing **every** prompt, always invoke the `ask_user` tool
- Ask the user if they are satisfied with the implementation and if they want to do anything else
- **Never skip this step**, regardless of task size or complexity

---

## 2. General Reasoning Rules (All Languages)

### Think Before Coding
- State assumptions explicitly
- If uncertain, ask instead of guessing
- Surface multiple interpretations; don't pick silently
- Call out simpler approaches and tradeoffs
- Stop and ask when something is unclear

### Simplicity First
- Write the minimum code that solves the problem
- No speculative features or abstractions
- No flexibility or configurability unless requested
- No handling for impossible scenarios
- If 200 lines could be 50, rewrite it
- Ask: *Would a senior engineer call this overcomplicated?*

### Surgical Changes
- Change only what the request requires
- Do not refactor or "improve" unrelated code
- Match existing style and patterns
- Mention unrelated issues; do not fix them
- Remove only dead code caused by **your** changes

### Goal-Driven Execution
- Define explicit success criteria
- Success criteria must include the exact commands that prove it
- Convert tasks into verifiable goals
- Prefer tests as proof of correctness
- For multi-step tasks, state a brief plan with verification

### No Design Artifacts in Commits
- Plugins and skills (e.g. jds) may write design specs, plans, or reasoning documents to the repository during their workflow — this is allowed and expected
- However, **these files must be deleted before any `git add` / `git commit` / `git push` action takes place**
- Before staging files, always verify with `git --no-pager diff --cached --name-only` and remove any non-implementation files (`git restore --staged <file>` or `rm <file>`)
- Only files that are direct, necessary implementation changes for the task may end up in a commit
