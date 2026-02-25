# AUDIT Mode

Analyze existing context files for over-specification, structural issues, redundancy, and broken links.
Produces a scored report with concrete auto-fix proposals — nothing changes until the user approves.

## Scope Discovery

Build the audit scope before any analysis begins.

### Step 1: Parse Index Links

Read `CLAUDE.md` and extract every file link (markdown links, relative paths). Each linked file enters the audit scope.

### Step 2: Check Manifest

If `.context-architect.json` exists in the project root, merge its configuration:

```json
{
  "context_files": ["CLAUDE.md", ".claude/**"],
  "reference_docs": ["src/auth/ARCHITECTURE.md"],
  "ignore": ["docs/plans/**"],
  "probe_model": "sonnet"
}
```

- `context_files` — additional Layer 1 files to include
- `reference_docs` — additional Layer 2 files to include
- `ignore` — globs to exclude from scope
- `probe_model` — model for Knowledge Diff sub-agent (default: `sonnet`)

If no manifest exists, link-based scope from Step 1 is sufficient.

### Step 3: Confirm Scope

Present the discovered file list to the user:

```
Audit scope:
  Layer 1: CLAUDE.md
  Layer 2: docs/CONVENTIONS.md, src/auth/ARCHITECTURE.md, ...
  Ignored: docs/plans/**

Proceed? [Y/n]
```

Wait for confirmation before running phases.

---

## Phase 1: Structural Analysis

Detect anti-patterns in context file structure.

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/detect-antipatterns.mjs --phase structure --root .
```

### Checks

| Anti-Pattern | Detection Rule |
|---|---|
| **Monolith** | Single file 300+ lines |
| **Role soup** | Behavior + tools + style + build topics mixed in one file |
| **Tool forcing** | Directives like "always use X", "never use Y" for tool selection |
| **Directory dump** | Full directory tree listing embedded in context |
| **Lint dump** | Lint/formatter rules copied verbatim into context |
| **README echo** | Content duplicated from README.md |
| **Philosophy essay** | Abstract design philosophy paragraphs with no actionable rules |
| **Index-content leak** | CLAUDE.md contains actual content instead of links to docs |

Each finding includes: file path, line range, anti-pattern type, and severity.

---

## Phase 2: Docs Analysis

Analyze reference docs (Layer 2) for structural quality.

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/detect-antipatterns.mjs --phase docs --root .
```

### Checks

| Anti-Pattern | Detection Rule |
|---|---|
| **Header-less doc** | No `#` heading at the start of the file — purpose unclear |
| **Fat doc** | Single doc exceeds 200 lines |
| **Single-role violation** | Doc covers multiple unrelated topics (should be split) |

---

## Phase 3: Link Integrity

Verify all links between Layer 1 and Layer 2 are valid.

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/detect-antipatterns.mjs --phase links --root .
```

### Checks

| Issue | Detection Rule |
|---|---|
| **Broken link** | Index references a file that does not exist |
| **Orphan doc** | Reference doc exists but is not linked from any index file |

---

## Phase 4: Knowledge Diff

The most important phase. Tests whether context tells the AI things it already knows.

### Step 1: Extract Statements

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/knowledge-probe.mjs --root . --extract
```

This reads all in-scope context files and outputs extracted statements as JSON:

```json
[
  {
    "file": "CLAUDE.md",
    "line": 12,
    "statement": "All components use PascalCase",
    "question": "In React, what is the standard component naming convention?"
  }
]
```

### Step 2: Probe Sub-Agent

Spawn a sub-agent with the following constraints:

- **Model:** from `.context-architect.json` → `probe_model` (default: `sonnet`)
- **Context:** NONE — the sub-agent must not see any project files
- **Input:** the extracted questions from Step 1
- **Batching:** group 5-10 related statements per call for efficiency

The sub-agent answers each question using only its training knowledge.

### Step 3: Classify Results

Compare each sub-agent response against the original context statement:

| Sub-Agent Response | Classification | Action |
|---|---|---|
| Matches context exactly | **REDUNDANT** | Recommend removal — the AI already knows this |
| Different answer | **UNIQUE** | Keep — project-specific knowledge |
| Doesn't know | **UNIQUE** | Keep — not in training data |
| Partial match | **REVIEW** | Present to user for decision (in user's language) |

### Examples

| Context Statement | Question | Sub-Agent Says | Classification |
|---|---|---|---|
| "All components use PascalCase" | "In React, what is the standard component naming convention?" | "PascalCase" | REDUNDANT |
| "Deploy with `./scripts/deploy.sh staging`" | "How would you deploy this project?" | "I don't have enough info" | UNIQUE |
| "Tests use vitest" | "Given this package.json, what test runner would you use?" | "vitest based on the config" | REDUNDANT |
| "API errors use AppError class" | "What is the standard error handling pattern?" | "Try-catch with Error subclasses" | REVIEW |

---

## CCS Calculation

After all phases complete, calculate the Context Complexity Score.

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/ccs-score.mjs --root .
```

### CCS Factors

| Factor | Score |
|--------|-------|
| Single file 300+ lines | +3 |
| Role mixing | +2 |
| Tool forcing | +2 |
| Duplicate information | +1 |
| No docs separation | +1 |
| Orphan doc | +1 |
| Broken link | +2 |
| Header-less doc | +1 |
| Fat doc (200+ lines) | +2 |
| Index-content leak | +2 |

### Rating Scale

| CCS Score | Rating | Meaning |
|-----------|--------|---------|
| 0-2 | **Safe** | Context is well-structured and minimal |
| 3-5 | **Risk** | Over-specification detected, improvements recommended |
| 6+ | **High Over-Specification** | Significant restructuring needed |

---

## Report Generation

Present all results using the standard 6-item output format. All user-facing text MUST be in the **user's language**.

### 1. Current State Summary

Describe what exists: file count, total line count, layer structure, scope.

### 2. Risk Rating

Map CCS score to rating:
- **Low** — CCS 0-2 (Safe)
- **Medium** — CCS 3-5 (Risk)
- **High** — CCS 6+ (High Over-Specification)

### 3. Over-specification Detection

List all findings from Phase 1-4, grouped by phase:

```
Phase 1 — Structure:
  [WARNING] CLAUDE.md: monolith (342 lines)
  [WARNING] CLAUDE.md: role soup (behavior + build + style mixed)

Phase 2 — Docs:
  [WARNING] docs/CONVENTIONS.md: fat doc (267 lines)

Phase 3 — Links:
  [ERROR] CLAUDE.md:15 → docs/DEPLOY.md (broken link)
  [WARNING] docs/OLD_NOTES.md (orphan — not linked from index)

Phase 4 — Knowledge Diff:
  [REDUNDANT] "React uses JSX for templates" (AI knows this)
  [REDUNDANT] "Use async/await for async operations" (AI knows this)
  [REVIEW] "AppError class hierarchy" (partial match — user decides)
  [UNIQUE] "Deploy requires VPN access" (keep)
```

### 4. Recommended Structure

Propose the target two-layer architecture:

- Which files to keep, split, merge, or remove
- Where to create new reference docs
- How to restructure the index

### 5. Fix Proposals

Concrete, actionable diffs for each finding. Present as a numbered list so the user can approve individually.

### 6. Reasoning Cost Impact

Estimate token injection before and after the proposed fixes:

```
Before: ~2,400 tokens (always injected per task)
After:  ~800 tokens (index only, docs loaded on demand)
Saving: ~1,600 tokens per task (~67% reduction)
```

---

## Auto-Fix Proposals

For each finding, generate a concrete fix. The user approves each one individually before any changes are applied.

### REDUNDANT Items

Show removal diff — delete lines that tell the AI what it already knows:

```diff
- ## React Conventions
- - Use PascalCase for components
- - Use JSX for templates
- - Use hooks for state management
```

### Structural Issues

Show restructuring diff — extract content into properly separated docs:

```diff
  # CLAUDE.md
- ## Error Handling
- All errors must extend AppError. Use throw new AppError('NOT_FOUND', 404)...
- The error middleware catches these and formats the response...
+ ## Error Handling
+ Custom AppError class hierarchy — see [error conventions](src/lib/errors/CONVENTIONS.md)
```

With a new file proposal:

```markdown
# Error Handling Conventions
Custom error class hierarchy for API error responses.

## AppError Class
...
```

### Missing Links

Show link additions for orphan docs:

```diff
  # CLAUDE.md
  ## Architecture
  System design overview — see [architecture](docs/ARCHITECTURE.md)
+
+ ## Deployment
+ Deployment process and environments — see [deploy guide](docs/DEPLOY.md)
```

### Broken Links

Show link corrections or removals:

```diff
  ## API Docs
- API documentation — see [api docs](docs/API.md)
+ API documentation — see [api docs](docs/api/README.md)
```

---

## Process Summary

```
1. Discover scope (parse index + manifest)
2. Confirm scope with user
3. Phase 1: Structural analysis     → detect-antipatterns.mjs --phase structure
4. Phase 2: Docs analysis           → detect-antipatterns.mjs --phase docs
5. Phase 3: Link integrity          → detect-antipatterns.mjs --phase links
6. Phase 4: Knowledge diff          → knowledge-probe.mjs --extract + sub-agent
7. Calculate CCS                    → ccs-score.mjs
8. Generate report (6-item format)
9. Present auto-fix proposals
10. Apply fixes only after user approval
```

## Reminders

- **User language rule:** All user-facing output MUST be in the user's language.
- **No changes without approval:** Present proposals, wait for explicit approval per fix, then apply.
- **Iron Law applies:** Every piece of context must justify its presence. Audit verifies this.
- **Sub-agent isolation:** The Knowledge Diff sub-agent must have ZERO project context to produce valid probes.
- **`${CLAUDE_PLUGIN_ROOT}` resolution:** When running tool commands, resolve `${CLAUDE_PLUGIN_ROOT}` to the plugin's actual installation directory.
