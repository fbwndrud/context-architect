# Actionable Report — Design

## Problem

Context Architect's AUDIT mode diagnoses over-specification but doesn't tell users
what to DO about it. Output is abstract scores and finding lists. Users want:

1. **Token impact** — concrete numbers: "you're wasting ~200 tokens per conversation"
2. **Structure proposals** — "split this file into 3, move this section"
3. **Deletion diffs** — "remove these 5 lines, they're redundant"

## Approach: Token Calculator CLI + Skill Enhancement (Option B)

Add one new CLI tool (`token-estimate.mjs`) for deterministic token estimation.
Enhance the audit-mode.md skill to produce actionable reports using tool outputs.

Zero external dependencies. Token estimation uses `Math.ceil(chars / 4)`.

## Architecture

```
token-estimate.mjs (NEW)
  └─ estimateTokens(rootPath, options?) → TokenReport

audit-mode.md (ENHANCED)
  ├─ Token impact section (uses token-estimate.mjs output)
  ├─ Structure proposals (uses Phase 1-3 findings + file headings)
  └─ Deletion diffs (uses Phase 4 REDUNDANT results)
```

## CLI: token-estimate.mjs

### Export

```js
export async function estimateTokens(rootPath, options = {})
```

### Output

```json
{
  "total_chars": 9600,
  "estimated_tokens": 2400,
  "files": [
    { "file": "CLAUDE.md", "chars": 1200, "tokens": 300, "role": "index" },
    { "file": "docs/CONVENTIONS.md", "chars": 4200, "tokens": 1050, "role": "linked" },
    { "file": "docs/DEPLOY.md", "chars": 4200, "tokens": 1050, "role": "linked" }
  ]
}
```

### Calculation

`Math.ceil(chars / 4)` — no external tokenizer dependency.

### Role classification

- `index` — files matching `config.context_files` (always injected per conversation)
- `linked` — files linked from index (loaded on demand)

### CLI flags

```bash
node token-estimate.mjs --root . [--context-file <path>]
```

Uses shared config loader (`tools/lib/config.mjs`).

## Skill: Report Enhancement

### Token Impact Section

After all phases complete, run `token-estimate.mjs` and compute:

```
Token Impact:
  Current index injection: ~300 tokens (CLAUDE.md)
  Current total context: ~2,400 tokens (index + 3 linked docs)

  Removable (REDUNDANT): ~120 tokens (5 statements)
  Separable (index → linked): ~80 tokens (3 code blocks)

  Estimated savings: ~200 tokens/conversation (8% reduction)
```

- REDUNDANT savings = sum of `Math.ceil(statement.length / 4)` for REDUNDANT items
- Separable = content identified as `index_content_leak` by Phase 1

### Structure Proposals

Map findings to concrete restructuring proposals:

| Finding | Proposal |
|---------|----------|
| monolith (300+ lines) | Split file by headings into N docs |
| index_content_leak | Move code blocks / long paragraphs to docs/, keep links |
| role_mixing | Separate into role-specific docs (style, testing, deploy) |
| fat_doc (200+ lines) | Split by sections |
| orphan_doc | Add link to index or suggest deletion |
| broken_link | Fix target or remove link |

The skill reads actual file headings to determine split points.
This is LLM-generated (not CLI) — the skill has the judgment to propose
meaningful splits based on content structure.

```
Structure Proposals:
  1. CLAUDE.md (342 lines) → split into 3
     - CLAUDE.md (index, ~30 lines) — links only
     - docs/conventions.md — style/naming sections
     - docs/testing.md — test-related sections

  2. docs/ARCHITECTURE.md (267 lines) → split into 2
     - docs/architecture.md — design overview
     - docs/api-reference.md — API details
```

### Deletion Diffs

For Phase 4 REDUNDANT items, generate line-level removal diffs:

```
Deletion Proposals (REDUNDANT, 5 items):

1. CLAUDE.md:12
   - All components use PascalCase
   Reason: Standard React convention

2. CLAUDE.md:45
   - Use async/await for asynchronous operations
   Reason: Basic JavaScript knowledge

3. docs/conventions.md:8
   - Tests should be placed in __tests__ directory
   Reason: Default Jest configuration

Apply: 1,2,3 / all / none
```

For REVIEW items, present with AI reasoning for user decision:

```
Needs Review (REVIEW, 2 items):

4. CLAUDE.md:23
   "API errors use AppError class"
   AI assessment: Custom error classes are common,
                  but "AppError" is project-specific
   → keep / remove?
```

**User controls:**
- Individual selection: `1,3` — apply only selected items
- Bulk: `all` — apply all REDUNDANT deletions
- Skip: `none` — apply nothing
- Apply only after explicit approval

## Tests

### Unit tests (token-estimate.test.mjs)

| Test | Description |
|------|-------------|
| clean project | Returns token estimate for CLAUDE.md only |
| with linked docs | Includes linked doc files in estimate |
| role classification | index vs linked correctly assigned |
| empty/missing CLAUDE.md | Returns 0 gracefully |
| chars/4 calculation | Verifies Math.ceil(chars / 4) |

### CLI tests (cli.test.mjs)

| Test | Description |
|------|-------------|
| --root flag | Outputs valid JSON with expected structure |
| --context-file flag | Respects custom context file |

### Not testable (skill-level)

- Report formatting quality
- Structure proposal relevance
- Deletion diff accuracy (depends on Phase 4 sub-agent)

## Files to modify

| File | Action |
|------|--------|
| tools/token-estimate.mjs | CREATE |
| tests/tools/token-estimate.test.mjs | CREATE |
| tests/tools/cli.test.mjs | MODIFY — add token-estimate CLI tests |
| skills/context-architect/audit-mode.md | MODIFY — enhance report sections |
| README.md | MODIFY — add token-estimate docs |

## Out of scope

- External tokenizer packages (zero-dependency policy)
- Automatic file splitting CLI (structure proposals are skill-level suggestions)
- Automatic deletion without user approval
- Benchmark data for CCS scores
