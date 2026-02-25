# Context Architect — Design Document

**Date:** 2026-02-25
**Status:** Approved

## Problem

Static, monolithic context files (CLAUDE.md, .cursorrules, etc.) increase agent reasoning cost without improving task success rates. Projects suffer from over-specification, role mixing, and redundant information that the AI already knows.

The research paper (2602.11988v1) demonstrated that static repository-level context files provide minimal benefit (+4%) while always increasing cost. However, the OpenClaw project showed that **hierarchical context indexing** — minimal index + on-demand reference docs — enables agents to handle large-scale projects effectively.

## Solution

A Claude Code plugin skill that acts as a **context structure architect and auditor**, enforcing:

- Role separation (one file = one role)
- Minimal injection (only what's always needed)
- Hierarchical indexing (CLAUDE.md as map, docs as destinations)
- Knowledge diff (don't tell the AI what it already knows)

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Plugin type | Standalone plugin | Independent versioning, publishable separately |
| Skill structure | Hub-and-spoke | SKILL.md dispatcher + mode files, practices its own on-demand principle |
| Target (v1) | Claude Code | .claude/, CLAUDE.md, MEMORY.md |
| Target (future) | Extensible | .cursorrules, .windsurfrules, copilot-instructions.md |
| Scope detection | Index-driven + optional manifest | Follow CLAUDE.md links; .context-architect.json for overrides |
| AUDIT output | Report + auto-fix proposal | User approves before applying |
| Trigger | Manual v1 | Hooks extensible for v2 |
| Knowledge probe model | Sonnet 4.6 (configurable) | Test the actual working model |
| Tooling | Node.js ESM (.mjs) | Cross-platform: macOS, Linux, Windows |
| Language | English | International compatibility |

## Architecture

### Plugin Structure

```
context-architect/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── context-architect/
│       ├── SKILL.md                  # Core principles + mode dispatch (~150 lines)
│       ├── create-mode.md            # CREATE: context + docs structure design
│       ├── audit-mode.md             # AUDIT: CCS scoring + anti-patterns + knowledge diff
│       └── update-mode.md            # UPDATE: sync both layers on change
├── tools/
│   ├── ccs-score.mjs                # Context Complexity Score calculator
│   ├── detect-antipatterns.mjs      # Structural anti-pattern detector (Phase 1-3)
│   └── knowledge-probe.mjs          # Knowledge Diff via fresh sub-agent (Phase 4)
├── hooks/
│   └── hooks.json                   # Prepared, disabled (v2)
├── package.json                     # Zero dependencies, metadata only
├── README.md
└── LICENSE
```

### Two-Layer Context System

The skill manages a two-layer information architecture:

```
Layer 1: Context Files (index/map)
  CLAUDE.md → minimal, links only
  .claude/ directory

Layer 2: Reference Docs (on-demand content)
  Anywhere in project (discovered via links from Layer 1)
  docs/, src/*/ARCHITECTURE.md, etc.
```

### Scope Detection

```
1. Parse CLAUDE.md → extract all file links
2. If .context-architect.json exists → merge additional scope
3. If no .context-architect.json → link-based scope only
```

Optional manifest (`.context-architect.json`):
```json
{
  "context_files": ["CLAUDE.md", ".claude/**"],
  "reference_docs": ["src/auth/ARCHITECTURE.md"],
  "ignore": ["docs/plans/**"],
  "probe_model": "sonnet"
}
```

## Three Modes

### MODE 1 — CREATE

**Input:** Project information (codebase, README, package.json, etc.)
**Output:**

- CLAUDE.md structure (minimal index)
- Recommended reference docs with locations
- Header-first templates for each doc
- Items to separate into docs vs. keep in CLAUDE.md

### MODE 2 — AUDIT

**Input:** Existing context files (discovered via index-driven scope)
**Output:** Report + auto-fix proposals

Four audit phases:

| Phase | Tool | Purpose |
|-------|------|---------|
| Phase 1 | detect-antipatterns.mjs | Context file structure (role mixing, line count, tool forcing) |
| Phase 2 | detect-antipatterns.mjs | Docs structure (header-first, appropriate length) |
| Phase 3 | detect-antipatterns.mjs | Link integrity (orphans, broken links, index-content leaks) |
| Phase 4 | knowledge-probe.mjs | Knowledge Diff (redundancy via fresh sub-agent) |

CCS (Context Complexity Score) calculated by `ccs-score.mjs`:

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

Rating: 0-2 Safe, 3-5 Risk, 6+ High Over-Specification

### MODE 3 — UPDATE

**Input:** Project changes (new features, refactors, dependency changes)
**Output:**

- Which files need modification
- Static vs. dynamic classification
- Whether to restructure (not just append)
- Link integrity check after changes

## Knowledge Diff (Phase 4)

The key innovation: using a fresh sub-agent with zero project context to test whether the AI already knows something.

### Process

```
1. Extract statements/rules from context files
2. Convert each to a neutral question
3. Spawn sub-agent (default: sonnet, configurable) with NO project context
4. Compare sub-agent response to context statement
5. Classify: REDUNDANT / UNIQUE / REVIEW
```

### Question Conversion Examples

| Context Statement | Sub-agent Question |
|---|---|
| "All components use PascalCase" | "In [framework], what is the standard component naming convention?" |
| "Tests use vitest" | "Given this package.json, what test runner would you use?" |
| "API errors use AppError class" | "In [framework], what is the standard API error handling pattern?" |
| "Deploy with ./scripts/deploy.sh staging" | "How would you deploy a [framework] project?" |

### Classification

| Sub-agent Response | Classification | Action |
|---|---|---|
| Matches context exactly | REDUNDANT | Recommend removal |
| Different answer | UNIQUE | Keep |
| Doesn't know | UNIQUE | Keep |
| Partial match | REVIEW | Ask user (in user's language) |

### Cost Optimization

- Batch 5-10 related statements per sub-agent call
- Cache results in `.context-architect-cache.json`
- Run only during AUDIT (not every session)
- Model configurable via manifest (`probe_model`)

## SKILL.md Core Principles

### The Iron Law

```
NO CONTEXT WITHOUT STRUCTURAL JUSTIFICATION
```

### 5 Principles

1. **Role Separation** — One file = one role. Never mix behavior rules, tool specs, style guides, build commands, and project descriptions.
2. **Minimal Injection** — "Is this always needed?" If no → docs. If yes → keep minimal.
3. **Static vs Dynamic** — Static files (CLAUDE.md) never contain session state. Dynamic files (MEMORY.md) never contain permanent rules.
4. **Index, Not Content** — CLAUDE.md is a map, not an encyclopedia. Link to content, don't embed it.
5. **Knowledge Diff** — Don't tell the AI what it already knows. Verify with a fresh probe.

### Anti-Patterns Detected

| Anti-Pattern | Description |
|---|---|
| Monolith | Single file 300+ lines |
| Role soup | Behavior + tools + style + build in one file |
| Tool forcing | "Always use X tool" directives |
| Directory dump | Full directory tree listing |
| Lint dump | All lint rules copied in |
| README echo | Duplicating README content |
| Philosophy essay | Abstract design philosophy paragraphs |
| Orphan doc | Reference doc not linked from any index |
| Header-less doc | Doc without clear purpose in first line |
| Fat doc | Single doc 200+ lines |
| Index-content leak | CLAUDE.md contains actual content, not just links |
| Broken link | Index references non-existent file |
| Redundant knowledge | Telling AI what it already knows |

### Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "More context = better results" | Paper proved this wrong. Over-specification increases failure rate. |
| "Just add it to CLAUDE.md" | Does it pass the "always needed?" test? |
| "It's only a few lines" | Lines compound. CCS doesn't lie. |
| "The agent needs to know everything" | Agents need structure, not volume. |
| "This framework is niche" | Probe it. The AI might know it fine. |
| "Better safe than sorry" | Redundant context increases reasoning cost for every task. |

## Output Format

All modes output in this structure:

1. **Current State Summary** — What exists now
2. **Risk Rating** — Low / Medium / High (based on CCS)
3. **Over-specification Detection** — Findings from Phase 1-4
4. **Recommended Structure** — Proposed changes
5. **Fix Proposals** — Concrete diffs (user approves before applying)
6. **Reasoning Cost Impact** — Before/after token estimate

User-facing reports are in the **user's language**.

## Niche Repo Exception

Context file creation beyond minimal is allowed when 2+ of these conditions are met:

- README is insufficient
- Build/test methods are unclear
- Legacy codebase
- Complex tool dependencies
- Missing documentation

Otherwise: minimal-only.

## Future (v2)

- **Hooks:** Auto-AUDIT on CLAUDE.md changes, auto-CREATE on project init
- **Multi-agent targets:** .cursorrules, .windsurfrules, copilot-instructions.md
- **Context Diff:** Automatic pre-commit check for context quality regression
- **Model-aware probing:** Different probe results per target agent (Claude vs Cursor vs Copilot)
