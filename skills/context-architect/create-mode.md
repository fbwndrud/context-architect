# CREATE Mode

Design a two-layer context architecture for a new or undocumented project.
Produces a minimal CLAUDE.md index (Layer 1) and colocated reference docs (Layer 2).

## Pre-flight Checks

Before starting, gather project state:

1. **Scan for existing context files** — Check project root for `CLAUDE.md`, `.claude/`, `.cursorrules`, `.windsurfrules`, `copilot-instructions.md`. If any exist, stop and switch to AUDIT mode (read `audit-mode.md`).

2. **Read project info** — Read `README.md`, `package.json` (or equivalent: `pyproject.toml`, `Cargo.toml`, `go.mod`, etc.) to understand project basics.

3. **Check Niche Repo Exception** — Evaluate these 5 conditions:
   - README is insufficient or missing
   - Build/test methods are unclear or non-standard
   - Legacy codebase with undocumented conventions
   - Complex or unusual tool dependencies
   - Critical documentation is missing

   **If 2+ conditions are met:** extended context is justified (more reference docs, more index entries). The Iron Law still applies to each individual item.
   **If 0-1 conditions are met:** minimal-only. Fewer docs, tighter index.

## Process

### Step 1: Analyze Project

Identify the following from source code, config files, and any existing documentation:

- **Stack:** language, framework, build system, test runner, deploy method
- **Custom vs Default:** which conventions are project-specific vs. standard framework defaults? Apply the Knowledge Diff principle — if a fresh AI with no project context would already know it, it's a default.
- **Documentation gaps:** what's already documented (README, inline comments, existing guides) vs. what's missing or only in tribal knowledge?

Focus on what makes this project *different* from a standard project using the same stack.

### Step 2: Design Layer 1 (Index)

Draft a minimal `CLAUDE.md` that acts as an index/map, not an encyclopedia.

Rules for the index:
- Each entry: **one-line description + link** to a reference doc
- Include ONLY: project-specific customs, non-obvious decisions, non-standard commands
- Do NOT embed content — link to it
- Do NOT include standard framework knowledge

Example index entry:
```markdown
## Error Handling
Custom AppError class hierarchy — see [error conventions](src/lib/errors/CONVENTIONS.md)
```

Bad index entry (content leak):
```markdown
## Error Handling
All errors must extend AppError. Use `throw new AppError('NOT_FOUND', 404)` for API errors.
The error middleware catches these and formats the response as `{ error: string, code: number }`.
```

### Step 3: Design Layer 2 (Reference Docs)

For each topic that needs depth beyond a one-liner, propose a reference doc:

- **Location:** colocate with relevant code when possible (e.g., `src/auth/CONVENTIONS.md`, `infra/DEPLOY.md`). Fall back to `docs/` for cross-cutting concerns.
- **Format:** header-first (purpose in the first line), single-role (one topic per doc), under 200 lines.
- **Naming:** use `CONVENTIONS.md`, `ARCHITECTURE.md`, or descriptive names. Avoid generic names like `notes.md`.

Each proposed doc gets a header-first template:
```markdown
# [Topic] Conventions
[One-sentence purpose statement]

## [First section]
...
```

### Step 4: Apply 3 Tests to Every Item

Before including any item in the index or a reference doc, run these three tests:

| Test | Question | If YES |
|------|----------|--------|
| **Public Knowledge** | Can an AI find this in public documentation? | Don't include |
| **Default vs Custom** | Is this the standard/default behavior for the framework? | Don't include |
| **Discoverable** | Can an AI learn this by reading the code itself? | Don't include |

**Decision rule:** If ANY test says "AI already knows this" — don't include it. Only include items that are project-specific, non-obvious, and not discoverable from code alone.

Examples:

| Item | Public? | Default? | Discoverable? | Include? |
|------|---------|----------|---------------|----------|
| "React uses JSX" | Yes | Yes | Yes | No |
| "Use vitest for tests" | - | - | Yes (package.json) | No |
| "Deploy requires VPN + `./scripts/deploy.sh staging`" | No | No | No | **Yes** |
| "AppError class with custom error codes" | No | No | Partially | **Yes** |
| "Use async/await" | Yes | Yes | Yes | No |
| "PRs require 2 approvals from platform team" | No | No | No | **Yes** |

### Step 5: Present to User

Present the complete proposed architecture. Do NOT create any files until the user explicitly approves.

Show:
1. Proposed `CLAUDE.md` content (the full index)
2. Proposed reference doc locations with header-first templates
3. What was excluded and why (grouped by test that eliminated it)
4. CCS estimate for the proposed architecture

Wait for user feedback. Iterate if needed. Only create files after approval.

## Output Template

Present results using this structure:

```
## Proposed Context Architecture

### Layer 1: CLAUDE.md (index)

[Full proposed CLAUDE.md content]

### Layer 2: Reference Docs

| Path | Purpose | Sections |
|------|---------|----------|
| [file path] | [one-line purpose] | [proposed sections] |

[Header-first template for each doc]

### Excluded (AI already knows)

| Item | Reason |
|------|--------|
| [excluded item] | [which test eliminated it] |

### CCS Estimate: [score] ([rating])

[Brief explanation of score]
```

## Reminders

- **User language rule:** All user-facing output MUST be in the user's language.
- **No files without approval:** Present the proposal, wait for explicit approval, then create.
- **Iron Law applies:** Every item must justify its presence. When in doubt, leave it out.
- **Minimal is the default.** The Niche Repo Exception allows more, but never allows redundancy.
