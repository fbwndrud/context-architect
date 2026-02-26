# Context Architect

A Claude Code plugin that audits and designs project context files.
Enforces role separation, minimal injection, hierarchical indexing, and knowledge diff.

## Install

> **Note:** Run the install command from your system terminal, not inside a Claude Code session.

**Global** — available in all projects:

```bash
claude plugin add --global github:fbwndrud/context-architect
```

**Project-only** — scoped to the current project:

```bash
claude plugin add github:fbwndrud/context-architect
```

## Usage

Invoke via `/context-architect` in any project:

**CREATE** — Design a two-layer context architecture for a new project.
Generates a root `CLAUDE.md` index and scoped reference docs for domain knowledge.

**AUDIT** — Analyze an existing project's context files.
Runs 4-phase analysis (structure, docs, links, knowledge diff) and produces a CCS score with fix proposals.

**UPDATE** — Sync context files after project changes.
Classifies what changed and updates context while enforcing the Iron Law.

## Tools

The plugin includes CLI tools for automated analysis. When invoked from skills, tools are resolved via `${CLAUDE_PLUGIN_ROOT}`:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/ccs-score.mjs --root .
node ${CLAUDE_PLUGIN_ROOT}/tools/detect-antipatterns.mjs --phase structure --root .
node ${CLAUDE_PLUGIN_ROOT}/tools/knowledge-probe.mjs --root . --extract [--batch]
node ${CLAUDE_PLUGIN_ROOT}/tools/token-estimate.mjs --root .
```

All tools accept `--context-file <path>` to override the default context file. Without this flag, the context file is resolved from `.context-architect.json` (see Configuration below), falling back to `CLAUDE.md`.

The token estimator (`token-estimate.mjs`) counts characters across all context files (index + linked docs) and estimates token injection cost using `chars / 4`. Output includes per-file breakdown with role classification (`index` vs `linked`).

Phase 4 (Knowledge Diff) runs during `/context-architect` AUDIT mode. The CLI extracts statements and generates batched probe prompts (`--extract --batch`). The skill then spawns isolated sub-agents via Task tool to classify each statement as REDUNDANT, UNIQUE, or REVIEW. REDUNDANT items get removal diffs for user approval. Phase 4 requires a Claude Code session — it cannot run standalone.

### Orphan Doc Cap

When scoring orphan documents, the CCS calculator caps individual `orphan_doc` factors at 10. Projects with more orphans receive a single `orphan_doc_overflow` summary (score: 0) noting how many additional orphans were found. This prevents score inflation in large doc trees.

## Configuration

Optional `.context-architect.json` in your project root. All tools read this file automatically:

```json
{
  "context_files": ["CLAUDE.md"],
  "reference_docs": ["src/auth/ARCHITECTURE.md"],
  "ignore": ["docs/plans/**"],
  "probe_model": "sonnet"
}
```

| Field | Description | Default |
|-------|-------------|---------|
| `context_files` | Layer 1 index files to include in scope | `["CLAUDE.md"]` |
| `reference_docs` | Additional Layer 2 files to include in scope | `[]` |
| `ignore` | Glob patterns to exclude from analysis (supports `*`, `**`, `?`) | `[]` |
| `probe_model` | Model for Knowledge Diff sub-agent | `"sonnet"` |

When no config file is present, tools use defaults (`CLAUDE.md` as the context file, no ignore patterns).

## Philosophy

Structure over volume. Static monolithic context files do not reliably improve agent performance.
Context Architect uses hierarchical indexing — `CLAUDE.md` as a map, domain docs as on-demand content — combined with knowledge diff to verify what the AI actually needs to be told versus what it can already infer from code.

## References

- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/pdf/2602.11988)
- [The Complete Guide to Claude Code: 70 Tips](https://drive.google.com/file/d/1x2x1T4lzTISnHGN8nd4KtMhL8iwi6QgU/view)
- [OpenClaw](https://github.com/openclaw/openclaw)

## License

MIT
